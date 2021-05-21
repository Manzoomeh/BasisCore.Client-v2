// import IContext from "../intrface/IContext";
// import IDataSource from "../intrface/IDataSource";
// import CommandBase from "./CommandBase";

// export default abstract class Command extends CommandBase {
//   constructor(element: Element) {
//     super(element);
//   }
//   async ExecuteCommandAsync(context: IContext): Promise<void> {
//     var dataSourceId = await this.GetAttributeValueAsync(
//       "datamembername",
//       context
//     );
//     var source: IDataSource = null;
//     if (dataSourceId) {
//       source = await context.WaitToGetDataSourceAsync(dataSourceId);
//     }
//     return await this.ExecuteAsyncEx(source, context);
//   }
//   abstract ExecuteAsyncEx(
//     dataSource: IDataSource,
//     context: IContext
//   ): Promise<void>;
// }
