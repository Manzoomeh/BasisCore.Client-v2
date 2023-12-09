import { DependencyContainer, inject, injectable } from "tsyringe";
import ISource from "../../data/ISource";
import SourceBaseComponent from "../SourceBaseComponent";
import IContext from "../../context/IContext";
import IToken from "../../token/IToken";
import IUserActionResult, {
  IUserActionAnswer,
} from "./schema/IUserActionResult";
import IBCUtil from "../../wrapper/IBCUtil";
import { APIProcessingCallbackArgument } from "../../CallbackArgument";
import IBlobValue from "./schema/part-control/upload/IBlobValue";

declare const $bc: IBCUtil;

@injectable()
export default class SchemaUploader extends SourceBaseComponent {
  readonly urlToken: IToken<string>;
  readonly blobToken: IToken<string>;
  readonly contentType: IToken<string>;
  readonly noCacheToken: IToken<string>;
  readonly nameToken: IToken<string>;
  readonly container: DependencyContainer;

  constructor(
    @inject("element") element: Element,
    @inject("context") context: IContext,
    @inject("dc") container: DependencyContainer
  ) {
    super(element, context);
    this.urlToken = this.getAttributeToken("url");
    this.blobToken = this.getAttributeToken("blob");
    this.contentType = this.getAttributeToken("Content-Type");
    this.noCacheToken = this.getAttributeToken("noCache");
    this.nameToken = this.getAttributeToken("name");
    this.container = container;
  }

  protected async renderSourceAsync(dataSource: ISource): Promise<any> {
    if (dataSource) {
      const fileList = Array<IFileInfo>();
      const source = dataSource.rows[0] as IUserActionResult;
      console.log(source, source.schemaVersion);
      const extractFileValue = (propId: number, list: IUserActionAnswer[]) => {
        list?.forEach((item) => {
          item.parts?.forEach((part) => {
            part.values?.forEach((partValue) => {
              if (partValue?.value?.content instanceof File) {
                const blobValue = <IBlobValue>partValue.value;
                var data = <IFileInfo>{
                  Id: $bc.util.getRandomName("blob"),
                  File: blobValue.content,
                  UploadToken: blobValue.uploadToken,
                  Part: part.part,
                  PrpId: propId,
                };
                partValue.value.content = data.Id;
                fileList.push(data);
              }
            });
          });
        });
      };
      source.properties.forEach((property) => {
        extractFileValue(property.propId, property.added);
        extractFileValue(property.propId, property.edited);
      });
      console.table(fileList);
      const url = await this.urlToken?.getValueAsync();
      let response: Response;
      const noCacheStr = await this.noCacheToken?.getValueAsync();
      const noCache = noCacheStr?.toLowerCase() == "true";
      const init: RequestInit = {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(source),
      };

      if (noCache) {
        (init.headers as Headers).append("pragma", "no-cache");
        (init.headers as Headers).append("cache-control", "no-cache");
      }

      const request = new Request(url, init);
      if (this.onProcessingAsync) {
        const args = this.createCallbackArgument<APIProcessingCallbackArgument>(
          {
            request: request,
          }
        );
        await this.onProcessingAsync(args);
        if (args.response) {
          response = await args.response;
        }
      }
      if (!response) {
        response = await fetch(request);
      }
      const json = <IAnswerProcessResult>await response.json();
      if (json.returnID) {
        if (fileList.length > 0) {
          const blobUrl = (await this.blobToken?.getValueAsync(true)) ?? url;
          var taskList = fileList.map(async (fileInfo) => {
            const formData = new FormData();
            formData.append("id", fileInfo.Id);
            formData.append("uploadToken", fileInfo.UploadToken);
            formData.append("returnID", json.returnID.toString());
            formData.append("part", fileInfo.Part.toString());
            formData.append("prpId", fileInfo.PrpId.toString());
            formData.append(fileInfo.File.name, fileInfo.File);
            if (this.container.isRegistered("scheduler", true)) {
              const scheduler = this.container.resolve<IScheduler>("scheduler");
              var process = scheduler.startPost(
                formData,
                blobUrl,
                fileInfo.File.name,
                null,
                false
              );
              return await process.task;
            } else {
              var request = await fetch(blobUrl, {
                method: "POST",
                body: formData,
              });
              return await request.json();
            }
          });
        }
        await Promise.all(taskList);
      } else {
        console.error("error in upload schema", json);
      }
    }
  }
}
interface IFileInfo {
  Id: string;
  File: File;
  UploadToken: string;
  Part: number;
  PrpId: number;
}
interface IAnswerProcessResult {
  returnID?: number;
  errorid?: number;
  message?: string;
}
declare type EventHandler<T> = {
  (args?: T): void;
};
interface IReportParam {
  percent: number;
  title: string;
  cancel?: boolean;
  error?: string;
}
interface IScheduler {
  startPost(
    data: FormData,
    url: string,
    title: string,
    callback?: EventHandler<IReportParam>,
    cancelable?: boolean
  ): ITaskOptions;
}
interface ITaskOptions {
  key?: string;
  container?: Element;
  title?: string;
  type?: any;
  reportHandlers?: any;
  task: Promise<any>;
  notify?: boolean;
  cancel?: () => void;
}
