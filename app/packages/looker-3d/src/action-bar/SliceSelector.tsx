import { PopoutSectionTitle } from "@fiftyone/components";
import { Checkbox } from "@fiftyone/core";
import * as fos from "@fiftyone/state";
import { useCallback, useMemo, useRef, useState } from "react";
import { useRecoilState, useRecoilValue } from "recoil";
import { ActionItem } from "../containers";
import { ACTION_SET_PCDS, currentActionAtom } from "../state";
import { ActionPopOver } from "./shared";

export const SliceSelector = () => {
  const activePcdSlices = useRecoilValue(fos.activePcdSlices);
  const allPcdSlices = useRecoilValue(fos.allPcdSlices);
  const [currentAction, setAction] = useRecoilState(currentActionAtom);
  const activeSliceDescriptorLabel = useRecoilValue(
    fos.activeSliceDescriptorLabel
  );

  const activeSlicesLabel = useMemo(() => {
    if (activePcdSlices.length === 0) {
      return "Select pcds";
    }
    if (activePcdSlices.length === 1) {
      return `${activePcdSlices[0]} selected`;
    }
    if (activePcdSlices.length === 2) {
      return activePcdSlices.join(" and ");
    }
    if (activePcdSlices.length === allPcdSlices.length) {
      return "All pcds selected";
    }
    return `${activePcdSlices.length} point-clouds selected`;
  }, [activePcdSlices, allPcdSlices]);

  const handleActionClick = useCallback(() => {
    if (currentAction === ACTION_SET_PCDS) {
      setAction(null);
    } else {
      setAction(ACTION_SET_PCDS);
    }
  }, [setAction, currentAction]);

  return (
    <>
      <ActionItem title="Select pcds">
        <div onClick={handleActionClick}>{activeSlicesLabel}</div>
      </ActionItem>

      {currentAction === ACTION_SET_PCDS && <PcdsSelector />}
    </>
  );
};

const PcdsSelector = () => {
  const [activePcdSlices, setActivePcdSlices] = useRecoilState(
    fos.activePcdSlices
  );
  const allPcdSlices = useRecoilValue(fos.allPcdSlices);

  const ref = useRef<HTMLDivElement>(null);

  const [isSelectorOpen, setIsSelectorOpen] = useState(false);
  fos.useOutsideClick(ref, () => isSelectorOpen && setIsSelectorOpen(false));

  if (allPcdSlices.length === 0) {
    return null;
  }

  return (
    <ActionPopOver>
      <PopoutSectionTitle>Select pcds</PopoutSectionTitle>
      <div>
        {allPcdSlices.map((slice) => {
          return (
            <Checkbox
              name={slice}
              key={slice}
              value={activePcdSlices.includes(slice)}
              muted={
                activePcdSlices.includes(slice) && activePcdSlices.length === 1
              }
              setValue={(value) => {
                setActivePcdSlices(
                  value
                    ? [...activePcdSlices, slice]
                    : activePcdSlices.filter((s) => s !== slice)
                );
              }}
            />
          );
        })}
      </div>
    </ActionPopOver>
  );
};
