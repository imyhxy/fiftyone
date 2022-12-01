import React, { useEffect, useMemo, useRef, useState } from "react";
import { filter, map } from "lodash";
import {
  atom,
  useRecoilState,
  useRecoilValue,
  useSetRecoilState,
} from "recoil";
import { usePreloadedQuery, useRefetchableFragment } from "react-relay";

import * as fos from "@fiftyone/state";
import { Selection } from "@fiftyone/components";

import ViewDialog, { viewDialogContent } from "./ViewDialog";
import {
  DatasetSavedViewsQuery,
  DatasetSavedViewsFragment,
} from "../../../Root/Root";
import { Box, LastOption, AddIcon, TextContainer } from "./styledComponents";

const DEFAULT_SELECTED: DatasetViewOption = {
  id: "1",
  label: "Unsaved view",
  color: "#9e9e9e",
  description: "Unsaved view",
  slug: "unsaved-view",
};

export const viewSearchTerm = atom<string>({
  key: "viewSearchTerm",
  default: "",
});
export const viewDialogOpen = atom<boolean>({
  key: "viewDialogOpen",
  default: false,
});
export const selectedSavedViewState = atom<DatasetViewOption | null>({
  key: "selectedSavedViewState",
  default: DEFAULT_SELECTED,
});

export type DatasetViewOption = Pick<
  fos.State.SavedView,
  "id" | "description" | "color"
> & { label: string; slug: string };

export interface DatasetView {
  id: string;
  name: string;
  datasetId: string;
  slug: string;
  color: string | null;
  description: string | null;
  viewStages: readonly string[];
}

interface Props {
  datasetName: string;
  queryRef: any;
}

export default function ViewSelection(props: Props) {
  const [selected, setSelected] = useRecoilState<DatasetViewOption | null>(
    selectedSavedViewState
  );

  const { datasetName, queryRef } = props;
  const setIsOpen = useSetRecoilState<boolean>(viewDialogOpen);
  const [savedViewParam, setSavedViewParam] = fos.useQueryState("view");
  const setEditView = useSetRecoilState(viewDialogContent);
  const setView = fos.useSetView();
  const [viewSearch, setViewSearch] = useRecoilState<string>(viewSearchTerm);

  const { savedViews: savedViewsV2 = [] } = fos.useSavedViews();

  const fragments = usePreloadedQuery(DatasetSavedViewsQuery, queryRef);
  const [data, refetch] = useRefetchableFragment(
    DatasetSavedViewsFragment,
    fragments
  );

  const items =
    (data as { savedViews: fos.State.SavedView[] })?.savedViews || [];
  const dataset = useRecoilValue(fos.dataset);

  const viewOptions: DatasetViewOption[] = useMemo(
    () => [
      DEFAULT_SELECTED,
      ...map(items, ({ name, color, description, slug, viewStages }) => ({
        id: slug,
        label: name,
        color,
        description,
        slug: slug,
        viewStages,
      })),
    ],
    [items]
  );

  const searchData: DatasetViewOption[] = useMemo(
    () =>
      filter(
        viewOptions,
        ({ id, label, description, slug }: DatasetViewOption) =>
          id === DEFAULT_SELECTED.id ||
          label.toLowerCase().includes(viewSearch) ||
          description?.toLowerCase().includes(viewSearch) ||
          slug?.toLowerCase().includes(viewSearch)
      ) as DatasetViewOption[],
    [viewOptions, viewSearch]
  );

  const loadedView = useRecoilValue<fos.State.Stage[]>(fos.view);
  const isEmptyView = !loadedView?.length;

  useEffect(() => {
    if (savedViewParam) {
      const potentialView = viewOptions.filter(
        (v) => v.slug === savedViewParam
      )?.[0];
      if (potentialView) {
        setSelected(potentialView);
        setView(loadedView, [], potentialView.label, true, potentialView.slug);
      } else {
        const potentialUpdatedView = savedViewsV2.filter(
          (v) => v.urlName === savedViewParam
        )?.[0];
        if (potentialUpdatedView) {
          refetch(
            { name: datasetName },
            {
              fetchPolicy: "network-only",
              onComplete: () => {
                setSelected({
                  ...potentialUpdatedView,
                  label: potentialUpdatedView.name,
                  slug: potentialUpdatedView.urlName,
                });
                setView(
                  [],
                  [],
                  potentialUpdatedView.name,
                  true,
                  potentialUpdatedView.urlName
                );
              },
            }
          );
        } else {
          // bad/old view param
          setSelected(DEFAULT_SELECTED);
          setView(loadedView, [], "", false, "");
        }
      }
    } else {
      // no view param
      if (selected && selected.slug !== DEFAULT_SELECTED.slug) {
        setSelected(DEFAULT_SELECTED);
        setView(loadedView, [], "", false, "");
      }
    }
  }, [savedViewParam]);

  useEffect(() => {
    const callback = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.code === "KeyS") {
        event.preventDefault();
        if (!isEmptyView) {
          setIsOpen(true);
        }
      }
    };

    document.addEventListener("keydown", callback);
    return () => {
      document.removeEventListener("keydown", callback);
    };
  }, [isEmptyView]);

  return (
    <Box>
      <ViewDialog
        savedViews={items}
        onEditSuccess={(savedView: fos.State.SavedView, reload?: boolean) => {
          refetch(
            { name: datasetName },
            {
              fetchPolicy: "network-only",
              onComplete: (data) => {
                if (savedView && reload) {
                  setSavedViewParam(savedView.slug);
                }
              },
            }
          );
        }}
        onDeleteSuccess={(name: string) => {
          refetch(
            { name: datasetName },
            {
              fetchPolicy: "network-only",
              onComplete: () => {
                setSavedViewParam(null);
              },
            }
          );
        }}
      />
      <Selection
        selected={selected}
        setSelected={(item: DatasetViewOption) => {
          setSelected(item);
          setView([], [], item.label, true, item.slug);
        }}
        items={searchData}
        onEdit={(item) => {
          setEditView({
            color: item.color || "",
            description: item.description || "",
            isCreating: false,
            name: item.label,
          });
          setIsOpen(true);
        }}
        search={{
          value: viewSearch,
          placeholder: "Search views...",
          onSearch: (term: string) => {
            setViewSearch(term);
          },
        }}
        lastFixedOption={
          <LastOption
            onClick={() => !isEmptyView && setIsOpen(true)}
            disabled={isEmptyView}
          >
            <Box style={{ width: "12%" }}>
              <AddIcon fontSize="small" disabled={isEmptyView} />
            </Box>
            <TextContainer disabled={isEmptyView}>
              Save current filters as view
            </TextContainer>
          </LastOption>
        }
      />
    </Box>
  );
}
