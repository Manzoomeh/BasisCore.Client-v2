// import { IData } from "../intrface/IData";
// import IDataSource from "../intrface/IDataSource";
// import Util from "../Util";
// import FaceCollection from "./FaceCollection";
// import RawFaceCollection from "./RawFaceCollection";
// import RawReplaceCollection from "./RawReplaceCollection";
// import RenderParam from "./RenderParam";
// import ReplaceCollection from "./ReplaceCollection";

// export default abstract class RenderableBase extends Command {
//   private streamDataSource: StreamDataSource;
//   private callback: { (data: IStreamData): Promise<any> };
//   constructor(element: Element) {
//     super(element);
//   }

//   async ExecuteAsyncEx(
//     dataSource: IDataSource,
//     turnContext: RenderingTurnContext
//   ): Promise<void> {
//     if (this.streamDataSource) {
//       this.streamDataSource.OnDataUpdateEvent.Remove(this.callback);
//       this.streamDataSource = null;
//     }
//     if (dataSource instanceof ConstantDataSource) {
//       await this.RenderDataAsync(dataSource.Data, turnContext, true);
//     } else if (dataSource instanceof StreamDataSource) {
//       this.streamDataSource = dataSource;
//       this.callback = async (data: IStreamData) =>
//         await this.RenderDataAsync(data, turnContext, data.Replace);
//       await this.callback(dataSource.Data);
//       dataSource.OnDataUpdateEvent.Add(this.callback);
//       await dataSource.UntilConnected;
//       dataSource.OnDataUpdateEvent.Remove(this.callback);
//       this.callback = null;
//       this.streamDataSource = null;
//     } else {
//       await this.RenderDataAsync(null, turnContext, true);
//     }
//   }

//   async RenderDataAsync(
//     data: IData,
//     turnContext: RenderingTurnContext,
//     replace: boolean
//   ): Promise<void> {
//     var result: string = null;
//     if (data) {
//       var rawIncompleteTemplate =
//         this.Element.querySelector("incomplete")?.GetTemplateToken();
//       var devider = this.Element.querySelector("divider");
//       var rawDividerTemplate = devider?.GetTemplateToken();
//       var rawDividerRowcount = devider?.GetIntegerToken("rowcount");
//       var rawReplaces = RawReplaceCollection.Create(this.Element);
//       var rawFaces = RawFaceCollection.Create(this.Element);

//       var faces = await rawFaces.ProcessAsync(data, turnContext.Context);
//       var replaces = await rawReplaces.ProcessAsync(turnContext.Context);
//       var dividerRowcount = await Util.GetValueOrDefaultAsync(
//         rawDividerRowcount,
//         turnContext.Context,
//         0
//       );
//       var dividerTemplate = await Util.GetValueOrDefaultAsync<string>(
//         rawDividerTemplate,
//         turnContext.Context
//       );
//       var incompleteTemplate = await Util.GetValueOrDefaultAsync<string>(
//         rawIncompleteTemplate,
//         turnContext.Context
//       );
//       result = await this.RenderAsync(
//         data,
//         turnContext,
//         faces,
//         replaces,
//         dividerRowcount,
//         dividerTemplate,
//         incompleteTemplate
//       );
//     }
//     if (data == null || (Util.HasValue(result) && result.length > 0)) {
//       var rawLayout = this.Element.querySelector("layout")?.GetTemplateToken();
//       var layout = await Util.GetValueOrDefaultAsync(
//         rawLayout,
//         turnContext.Context,
//         "@child"
//       );
//       result = Util.ReplaceEx(layout, "@child", result ?? "");
//     } else {
//       var rawElseLayout =
//         this.Element.querySelector("else-layout")?.GetTemplateToken();
//       result = await Util.GetValueOrDefaultAsync(
//         rawElseLayout,
//         turnContext.Context,
//         ""
//       );
//     }
//     await this.ApplyResultAsync(result, turnContext, replace);
//   }

//   RenderAsync(
//     dataSource: IData,
//     context: RenderingTurnContext,
//     faces: FaceCollection,
//     replaces: ReplaceCollection,
//     dividerRowcount: number,
//     dividerTemplate: string,
//     incompleteTemplate: string
//   ): Promise<string> {
//     return new Promise((resolve) => {
//       var param = new RenderParam(
//         replaces,
//         dataSource.Rows.length,
//         dividerRowcount,
//         dividerTemplate,
//         incompleteTemplate
//       );
//       var result: string = "";
//       dataSource.Rows.forEach((row, _index, _) => {
//         param.Data = row;
//         result += faces.Render(param, context.Context);
//       });
//       resolve(result);
//     });
//   }
// }
