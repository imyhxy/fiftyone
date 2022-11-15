"""
FiftyOne Server mutations

| Copyright 2017-2022, Voxel51, Inc.
| `voxel51.com <https://voxel51.com/>`_
|
"""
from dataclasses import asdict
import strawberry as gql
import typing as t

import eta.core.serial as etas

import fiftyone as fo
import fiftyone.constants as foc
import fiftyone.core.odm as foo
from fiftyone.core.session.events import StateUpdate
import fiftyone.core.stages as fos
import fiftyone.core.view as fov

from fiftyone.server.data import Info
from fiftyone.server.events import get_state, dispatch_event
from fiftyone.server.filters import GroupElementFilter, SampleFilter
from fiftyone.server.query import Dataset, SidebarGroup
from fiftyone.server.scalars import BSON, BSONArray, JSON
from fiftyone.server.view import get_view, extend_view


@gql.input
class SelectedLabel:
    field: str
    label_id: str
    sample_id: str
    frame_number: t.Optional[int] = None


@gql.type
class ViewResponse:
    view: BSONArray
    dataset: Dataset
    view_name: t.Optional[str] = None


@gql.input
class SidebarGroupInput(SidebarGroup):
    pass


@gql.input
class StateForm:
    add_stages: t.Optional[BSONArray] = None
    filters: t.Optional[JSON] = None
    sample_ids: t.Optional[t.List[str]] = None
    labels: t.Optional[t.List[SelectedLabel]] = None
    extended: t.Optional[BSON] = None
    slice: t.Optional[str] = None


@gql.input
class SavedViewInfo:
    name: t.Optional[str] = None
    description: t.Optional[str] = None
    color: t.Optional[str] = None


@gql.type
class Mutation:
    @gql.mutation
    async def set_dataset(
        self,
        subscription: str,
        session: t.Optional[str],
        name: t.Optional[str],
        info: Info,
    ) -> bool:
        state = get_state()
        state.dataset = fo.load_dataset(name) if name is not None else None
        state.selected = []
        state.selected_labels = []
        state.view = None
        await dispatch_event(subscription, StateUpdate(state=state))
        return True

    @gql.mutation
    async def set_sidebar_groups(
        self,
        dataset: str,
        stages: BSONArray,
        sidebar_groups: t.List[SidebarGroupInput],
    ) -> bool:
        view = get_view(dataset, stages=stages)

        current = (
            {
                group.name: group.expanded
                for group in view._dataset.app_config.sidebar_groups
            }
            if view._dataset.app_config.sidebar_groups is not None
            else {}
        )

        view._dataset.app_config.sidebar_groups = [
            foo.SidebarGroupDocument(
                name=group.name,
                expanded=current.get(group.name, None),
                paths=group.paths,
            )
            for group in sidebar_groups
        ]
        view._dataset._doc.save()
        return True

    @gql.mutation
    async def set_selected(
        self,
        subscription: str,
        session: t.Optional[str],
        selected: t.List[str],
    ) -> bool:
        state = get_state()

        state.selected = selected
        await dispatch_event(subscription, StateUpdate(state=state))
        return True

    @gql.mutation
    async def set_selected_labels(
        self,
        subscription: str,
        session: t.Optional[str],
        selected_labels: t.List[SelectedLabel],
    ) -> bool:
        state = get_state()

        state.selected_labels = [asdict(l) for l in selected_labels]
        await dispatch_event(subscription, StateUpdate(state=state))
        return True

    @gql.mutation
    async def set_view(
        self,
        subscription: str,
        session: t.Optional[str],
        view: BSONArray,
        view_name: t.Optional[str],
        dataset_name: str,
        form: t.Optional[StateForm],
        info: Info,
    ) -> ViewResponse:
        state = get_state()
        state.selected = []
        state.selected_labels = []
        if view_name and state.dataset.has_view(view_name):
            state.view = state.dataset.load_view(view_name)
        elif form:
            view = get_view(
                dataset_name,
                stages=view,
                filters=form.filters,
            )
            if form.slice:
                view = view.select_group_slices([form.slice])

            if form.sample_ids:
                view = fov.make_optimized_select_view(view, form.sample_ids)

            if form.add_stages:
                for d in form.add_stages:
                    stage = fos.ViewStage._from_dict(d)
                    view = view.add_stage(stage)

            if form.extended:
                view = extend_view(view, form.extended, True)

            state.view = view
            view = view._serialize()

        else:
            state.view = fov.DatasetView._build(state.dataset, view)
        await dispatch_event(subscription, StateUpdate(state=state))
        dataset = await Dataset.resolver(
            name=dataset_name,
            view=view,
            view_name=view_name if view_name else state.view.name,
            info=info,
        )
        return ViewResponse(
            view=state.view._serialize(),
            dataset=dataset,
            view_name=view_name if view_name else state.view.name,
        )

    @gql.mutation
    async def store_teams_submission(self) -> bool:
        etas.write_json({"submitted": True}, foc.TEAMS_PATH)
        return True

    @gql.mutation
    async def set_group_slice(
        self,
        subscription: str,
        session: t.Optional[str],
        view: BSONArray,
        view_name: t.Optional[str],
        slice: str,
        info: Info,
    ) -> Dataset:
        state = get_state()
        state.dataset.group_slice = slice
        await dispatch_event(subscription, StateUpdate(state=state))
        return await Dataset.resolver(
            name=state.dataset.name,
            view=view,
            view_name=view_name if view_name else state.view.name,
            info=info,
        )

    @gql.mutation
    def save_view(
        self,
        subscription: str,
        session: t.Optional[str],
        view_name: str,
        description: t.Optional[str] = None,
        color: t.Optional[str] = None,
    ) -> bool:
        state = get_state()
        dataset = state.dataset
        dataset.save_view(
            view_name, state.view, description=description, color=color
        )
        dataset.reload()
        state.view = dataset.load_view(view_name)
        state.name = view_name
        return state.view

    @gql.mutation
    def delete_saved_view(
        self, subscription: str, session: t.Optional[str], view_name: str
    ) -> bool:
        state = get_state()
        dataset = state.dataset
        if dataset.has_views and dataset.has_view(view_name):
            deleted_view_name = state.dataset.delete_view(view_name)
        else:
            print("Attempting to delete non-existent view: %s", view_name)
        if state.view_name == deleted_view_name:
            state.view = dataset.view()
            state.view_name = None
        return state.dataset.saved_views

    @gql.mutation
    def update_saved_view(
        self,
        subscription: str,
        session: t.Optional[str],
        view_name: str,
        updated_info: SavedViewInfo,
    ) -> bool:
        state = get_state()
        dataset = state.dataset
        if dataset.has_views and dataset.has_view(view_name):
            dataset.update_view_info(view_name, asdict(updated_info))
        dataset.reload()
        return state.dataset.saved_views
