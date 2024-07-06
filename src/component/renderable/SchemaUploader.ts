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
      const complexObject = dataSource.rows[0];
      const source: IUserActionResult = complexObject.data ?? complexObject;
      const name = await this.nameToken?.getValueAsync();
      const extractFileValue = (propId: number, list: IUserActionAnswer[]) => {
        list?.forEach((item) => {
          item.parts?.forEach((part) => {
            part.values?.forEach((partValue) => {
              if (partValue?.value?.content instanceof File) {
                const blobValue = <IBlobValue>partValue.value;
                const data = <IFileInfo>{
                  blobid: $bc.util.getRandomName("blob"),
                  file: blobValue.content,
                  uploadtoken: blobValue.uploadToken,
                  part: part.part,
                  prpid: propId,
                };
                partValue.value.content = data.blobid;
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
      const url = await this.urlToken?.getValueAsync();
      let response: Response;
      const noCacheStr = await this.noCacheToken?.getValueAsync();
      const noCache = noCacheStr?.toLowerCase() == "true";
      const init: RequestInit = {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(complexObject),
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
      const postAnswerResult = <IAnswerProcessResult>await response.json();
      if (name) {
        const data = {
          answer: source,
          postAnswerResult: postAnswerResult,
          fileList: fileList,
        };
        this.context.setAsSource(`${name}.uploading`, data);
      }
      if (postAnswerResult.usedforid) {
        if (fileList.length > 0) {
          const taskList = fileList.map(async (fileInfo) => {
            const baseUrl = (await this.blobToken?.getValueAsync(true)) ?? url;
            const blobUrl =
              baseUrl +
              (baseUrl.indexOf("?") != -1 ? "&" : "?") +
              `uploadtoken=${fileInfo.uploadtoken}&blobid=${fileInfo.blobid}` +
              `&prpid=${fileInfo.prpid}&part=${fileInfo.part}` +
              `&usedforid=${postAnswerResult.usedforid}&lid=${source.lid}`;

            const formData = new FormData();
            formData.append("blobid", fileInfo.blobid);
            formData.append("uploadtoken", fileInfo.uploadtoken);
            formData.append("usedforid", postAnswerResult.usedforid.toString());
            formData.append("lid", source.lid.toString());
            formData.append("prpid", fileInfo.prpid.toString());
            formData.append("part", fileInfo.part.toString());
            formData.append(fileInfo.file.name, fileInfo.file);
            if (this.container.isRegistered("scheduler", true)) {
              const scheduler = this.container.resolve<IScheduler>("scheduler");
              const process = scheduler.startPost(
                formData,
                blobUrl,
                fileInfo.file.name,
                null,
                false
              );
              return await process.task;
            } else {
              const request = await fetch(blobUrl, {
                method: "POST",
                body: formData,
              });
              return await request.json();
            }
          });
          const uploadResult = await Promise.all(taskList);
          if (name) {
            const data = {
              answer: source,
              postAnswerResult: postAnswerResult,
              fileList: fileList,
              uploadFileResult: uploadResult,
            };
            this.context.setAsSource(`${name}.uploaded`, data);
          }
        }
      } else {
        console.error(
          `The 'usedforid' property not set in result returned from ${url}`,
          postAnswerResult
        );
      }
    }
  }
}
interface IFileInfo {
  blobid: string;
  file: File;
  uploadtoken: string;
  part: number;
  prpid: number;
}
interface IAnswerProcessResult {
  usedforid?: number;
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
