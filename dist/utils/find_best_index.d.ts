import { ConditionStorageTypeNested } from "../Condition";
import { ModelIndexes } from "../Model";
interface IndexSpecification {
    tableIndex: boolean;
    indexName?: string;
}
export default function (modelIndexes: ModelIndexes, comparisonChart: ConditionStorageTypeNested): IndexSpecification;
export {};
