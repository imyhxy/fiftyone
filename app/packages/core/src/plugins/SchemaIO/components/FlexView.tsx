import { Box, BoxProps } from "@mui/material";
import React from "react";
import { HeaderView } from ".";
import {
  getAdjustedLayoutWidth,
  getComponentProps,
  getMarginSx,
  getPaddingSx,
  getPath,
  getProps,
  parseGap,
  spaceToHeight,
} from "../utils";
import { ObjectSchemaType, PropertyType, ViewPropsType } from "../utils/types";
import DynamicIO from "./DynamicIO";

export default function FlexView(props: ViewPropsType) {
  const { schema, path, data } = props;
  const { properties, view = {} } = schema as ObjectSchemaType;
  const { alignX, alignY, align_x, align_y, gap = 1, orientation } = view;
  const direction = orientation === "horizontal" ? "row" : "column";

  const propertiesAsArray: PropertyType[] = [];

  for (const property in properties) {
    propertiesAsArray.push({ id: property, ...properties[property] });
  }

  const layoutHeight = props?.layout?.height;
  const parsedGap = parseGap(gap);
  const adjustedLayoutWidth = getAdjustedLayoutWidth(
    props?.layout?.width,
    parsedGap
  );

  const baseGridProps: BoxProps = {
    sx: {
      display: "flex",
      gap: parsedGap,
      justifyContent: alignX || align_x || "start",
      alignItems: alignY || align_y || "start",
      flexDirection: direction,
      ...getPaddingSx(view),
      ...getMarginSx(view),
    },
  };

  return (
    <Box {...getComponentProps(props, "container")}>
      <HeaderView {...props} divider nested />
      <Box {...getProps(props, "grid", baseGridProps)}>
        {propertiesAsArray.map((property) => {
          const { id, view = {} } = property;
          const { alignX, alignY, align_x, align_y, space } = view;
          const itemPath = getPath(path, id);
          const baseItemProps: BoxProps = {
            sx: {
              justifySelf: alignX || align_x || "unset",
              alignSelf: alignY || align_y || "unset",
              maxHeight:
                orientation === "vertical"
                  ? spaceToHeight(space, layoutHeight)
                  : undefined,
            },
            key: id,
          };
          return (
            <Box
              key={id}
              {...getProps(
                {
                  ...props,
                  schema: property,
                  layout: { width: adjustedLayoutWidth, height: layoutHeight },
                },
                "item",
                baseItemProps
              )}
            >
              <DynamicIO
                {...props}
                schema={property}
                path={itemPath}
                data={data?.[id]}
                parentSchema={schema}
                relativePath={id}
              />
            </Box>
          );
        })}
      </Box>
    </Box>
  );
}
