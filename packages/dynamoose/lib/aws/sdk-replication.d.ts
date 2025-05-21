// eslint-disable-next-line @typescript-eslint/no-unused-vars
import * as DynamoDB from "@aws-sdk/client-dynamodb";

declare module "@aws-sdk/client-dynamodb" {
  interface CreateTableInput {
    /**
     * The replication specification for the table.
     */
    ReplicationSpecification?: {
      /**
       * The regions where the table should be replicated.
       */
      Regions: string[];
    };
  }

  interface UpdateTableInput {
    /**
     * The replication specification for the table.
     */
    ReplicationSpecification?: {
      /**
       * The regions where the table should be replicated.
       */
      Regions: string[];
    };
  }

  interface TableDescription {
    /**
     * The replication specification for the table.
     */
    ReplicationSpecification?: {
      /**
       * The regions where the table should be replicated.
       */
      Regions: string[];
    };
  }
}
