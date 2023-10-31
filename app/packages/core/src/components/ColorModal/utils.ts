import { isValidColor } from "@fiftyone/looker/src/overlays/util";
import { ColorSchemeInput, MaskColorInput } from "@fiftyone/relay";
import colorString from "color-string";
import { isEmpty, xor } from "lodash";

// Masataka Okabe and Kei Ito have proposed a palette of 8 colors on their
// website Color Universal Design (CUD). This palette is a “Set of colors that
// is unambiguous both to colorblinds and non-colorblinds”.
//
// https://jfly.uni-koeln.de/color/
export const colorBlindFriendlyPalette = [
  "#E69F00", // orange
  "#56b4e9", // skyblue
  "#009e74", // bluegreen
  "#f0e442", // yellow
  "#0072b2", // blue
  "#d55e00", // vermillion
  "#cc79a7", // reddish purple
];

export enum ACTIVE_FIELD {
  JSON = "JSON editor",
  GLOBAL = "Global settings",
  LABEL_TAGS = "label_tags",
}

// disregard the order
export const isSameArray = (a: readonly unknown[], b: readonly unknown[]) => {
  return isEmpty(xor(a, b));
};

export const isString = (v: unknown) => typeof v === "string";
export const isObject = (v: unknown) => typeof v === "object" && v != null;
export const isBoolean = (v: unknown) => typeof v === "boolean";

const getValidLabelColors = (labelColors: unknown[]) => {
  return labelColors?.filter((x) => {
    return (
      x &&
      isObject(x) &&
      isString(x["value"]) &&
      x["value"] !== "" &&
      isString(x["color"])
    );
  }) as { value: string; color: string }[];
};

// should return a valid customize color object that can be used to setCustomizeColor
export const validateJSONSetting = (
  json: ColorSchemeInput["fields"]
): ColorSchemeInput["fields"] => {
  const filtered =
    json?.filter((s) => s && isObject(s) && isString(s["path"])) || [];

  const f = filtered.map((input) => ({
    path: input["path"],
    fieldColor: input["fieldColor"] ?? null,
    colorByAttribute: isString(input["colorByAttribute"])
      ? input["colorByAttribute"]
      : null,
    valueColors: Array.isArray(input["valueColors"])
      ? getValidLabelColors(input["valueColors"])
      : [],
    targetMasksColors: Array.isArray(input.maskTargetsColors)
      ? getValidMaskColors(input.maskTargetsColors)
      : [],
    colorscale: validateColorscale(input.colorscale),
  }));

  return f.filter((x) => {
    const hasFieldSetting = x.fieldColor;
    const hasAttributeColor = x.colorByAttribute;
    const hasLabelColors = x.valueColors?.length > 0;
    const hasColorscale =
      (x.colorscale?.list?.length && x.colorscale?.list?.length > 0) ||
      x.colorscale?.name;
    const hasTargetMasks = x.targetMasksColors?.length > 0;
    return (
      hasFieldSetting ||
      hasAttributeColor ||
      hasLabelColors ||
      hasColorscale ||
      hasTargetMasks
    );
  });
};

export const validateLabelTags = (
  obj: ColorSchemeInput["labelTags"]
): ColorSchemeInput["labelTags"] => {
  if (typeof obj === "object" && obj !== null) {
    const f = {
      fieldColor: obj["fieldColor"] ?? null,
      valueColors: Array.isArray(obj["valueColors"])
        ? getValidLabelColors(obj["valueColors"])
        : [],
    };

    return f.fieldColor || f.valueColors?.length > 0 ? f : null;
  }
};

const getValidMaskColors = (maskColors: unknown[]) => {
  return maskColors
    ?.filter((x) => {
      return (
        x &&
        isObject(x) &&
        isString(x["idx"]) &&
        typeof Number(x["idx"]) == "number" &&
        isString(x["color"])
      );
    })
    .map((y) => ({
      idx: Number(y["idx"]),
      color: y.color,
    })) as MaskColorInput[];
};

export const validateMaskColor = (
  arr: any
): ColorSchemeInput["defaultMaskTargetsColors"] => {
  return Array.isArray(arr) ? getValidMaskColors(arr) : null;
};

const getValidColorscale = (arr: any[]) => {
  const r = arr.filter((sample) => {
    return (
      typeof sample === "object" &&
      typeof Number(sample.value) === "number" &&
      Number(sample.value) <= 1 &&
      Number(sample.value) >= 0 &&
      isValidColor(sample.color)
    );
  });

  const y = r.map((x) => {
    const converted = colorString.get.rgb(x.color) as [
      number,
      number,
      number,
      number
    ];
    return {
      value: Number(x.value),
      color: `rgb(${converted[0]}, ${converted[1]}, ${converted[2]})`,
    };
  });

  return y;
};

export const validateColorscale = (
  obj: any
): ColorSchemeInput["colorscale"] => {
  if (typeof obj !== "object") {
    return {
      name: null,
      list: null,
    };
  }

  const r = {
    name:
      typeof obj.name === "string" && namedColorScales.includes(obj.name)
        ? obj.name
        : null,
    list: Array.isArray(obj.list) ? getValidColorscale(obj.list) : null,
  };

  return r;
};

export const getDisplayName = (path: ACTIVE_FIELD | { path: string }) => {
  if (typeof path === "object") {
    if (path.path === "tags") {
      return "sample tags";
    }
    if (path.path === "_label_tags") {
      return "label tags";
    }
    return path.path;
  }
  return path;
};

export const getRandomColorFromPool = (pool: readonly string[]) =>
  pool[Math.floor(Math.random() * pool.length)];

const namedColorScales = [
  "aggrnyl",
  "agsunset",
  "blackbody",
  "bluered",
  "blues",
  "blugrn",
  "bluyl",
  "brwnyl",
  "bugn",
  "bupu",
  "burg",
  "burgyl",
  "cividis",
  "darkmint",
  "electric",
  "emrld",
  "gnbu",
  "greens",
  "greys",
  "hot",
  "inferno",
  "jet",
  "magenta",
  "magma",
  "mint",
  "orrd",
  "oranges",
  "oryel",
  "peach",
  "pinkyl",
  "plasma",
  "plotly3",
  "pubu",
  "pubugn",
  "purd",
  "purp",
  "purples",
  "purpor",
  "rainbow",
  "rdbu",
  "rdpu",
  "redor",
  "reds",
  "sunset",
  "sunsetdark",
  "teal",
  "tealgrn",
  "turbo",
  "viridis",
  "ylgn",
  "ylgnbu",
  "ylorbr",
  "ylorrd",
  "algae",
  "amp",
  "deep",
  "dense",
  "gray",
  "haline",
  "ice",
  "matter",
  "solar",
  "speed",
  "tempo",
  "thermal",
  "turbid",
  "armyrose",
  "brbg",
  "earth",
  "fall",
  "geyser",
  "prgn",
  "piyg",
  "picnic",
  "portland",
  "puor",
  "rdgy",
  "rdylbu",
  "rdylgn",
  "spectral",
  "tealrose",
  "temps",
  "tropic",
  "balance",
  "curl",
  "delta",
  "oxy",
  "edge",
  "hsv",
  "icefire",
  "phase",
  "twilight",
  "mrybm",
  "mygbm",
];
