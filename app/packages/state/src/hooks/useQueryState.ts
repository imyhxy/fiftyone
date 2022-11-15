import { useCallback, useContext } from "react";
import qs from "qs";
import { RouterContext } from "../routing";
import { useRecoilValue } from "recoil";
import * as fos from "@fiftyone/state";

const useQueryState = (query) => {
  const router = useContext(RouterContext);
  const dataset = useRecoilValue(fos.dataset);
  const { savedViews = [] } = fos.useSavedViews();

  const setQuery = useCallback(
    (value) => {
      const existingQueries = qs.parse(location.search, {
        ignoreQueryPrefix: true,
      });

      const queryString = qs.stringify(
        { ...existingQueries, [query]: value },
        { skipNulls: true }
      );
      console.log("queryString", existingQueries);

      // const loadedView = savedViews.filter((sv) => {
      //   sv.urlName ===
      // })

      // if (queryString) {
      //   location.replace(location.pathname + `?${queryString}`);
      // }

      console.log("----", router.history.location.state);
      console.log(">>>>", dataset);

      router.history.push(`${location.pathname}?${queryString}`, {
        state: {
          ...router.history.location.state.state,
          selected: [],
          selectedLabels: [],
          // view: ,
          ...(dataset.viewCls ? { viewCls: dataset.viewCls } : {}),
          ...(dataset ? { dataset } : {}),
        },
      });
    },
    [history, location, query]
  );

  return [
    qs.parse(location.search, { ignoreQueryPrefix: true })[query],
    setQuery,
  ];
};

export default useQueryState;
