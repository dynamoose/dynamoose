import Internal from "../../Internal";
import { Item } from "../../Item";
import { Model } from "../../Model";
const { internalProperties } = Internal.General;

const formatTableNameFromModelInternal = (model: Model<Item>) => {
  const { tableName, options } =
    model.getInternalProperties(internalProperties);
  const { suffix = "", prefix = "" } = options || {};

  return `${prefix}${tableName}${suffix}`;
};

export default formatTableNameFromModelInternal;
