import { inject, injectable } from "tsyringe";
import {
  APIProcessedCallbackArgument,
  APIProcessingCallbackArgument,
} from "../../CallbackArgument";
import IContext from "../../context/IContext";
import Data from "../../data/Data";
import Source from "../../data/Source";
import IToken from "../../token/IToken";
import { HttpMethod, IServerResponse } from "../../type-alias";
import SourceComponent from "./SourceComponent";

@injectable()
export default class APIComponent extends SourceComponent {
  readonly urlToken: IToken<string>;
  readonly methodToken: IToken<string>;
  readonly bodyToken: IToken<string>;
  readonly nameToken: IToken<string>;
  readonly contentType: IToken<string>;
  readonly noCacheToken: IToken<string>;

  constructor(
    @inject("element") element: Element,
    @inject("context") context: IContext
  ) {
    super(element, context);
    this.urlToken = this.getAttributeToken("url");
    this.methodToken = this.getAttributeToken("method");
    this.bodyToken = this.getAttributeToken("body");
    this.nameToken = this.getAttributeToken("name");
    this.contentType = this.getAttributeToken("Content-Type");
    this.noCacheToken = this.getAttributeToken("noCache");
  }

  protected async runAsync(): Promise<void> {
    const method = (
      await this.methodToken?.getValueAsync()
    )?.toUpperCase() as HttpMethod;
    const url = await this.urlToken?.getValueAsync();
    let response: Response;
    const body = await this.bodyToken?.getValueAsync();
    const noCacheStr = await this.noCacheToken?.getValueAsync();
    const noCache = noCacheStr?.toLowerCase() == "true";
    const init: RequestInit = {
      method: method,
      body: body,
    };

    const contentType = this.contentType
      ? await this.contentType.getValueAsync()
      : "application/json";
    if (contentType && contentType.length > 0) {
      init.headers = new Headers();
      init.headers.append("Content-Type", contentType);
    }
    if (noCache) {
      if (!init.headers) {
        init.headers = new Headers();
      }
      (init.headers as Headers).append("pragma", "no-cache");
      (init.headers as Headers).append("cache-control", "no-cache");
    }
    const request = new Request(url, init);
    if (this.onProcessingAsync) {
      const args = this.createCallbackArgument<APIProcessingCallbackArgument>({
        request: request,
      });
      await this.onProcessingAsync(args);
      if (args.response) {
        response = await args.response;
      }
    }
    if (!response) {
      response = await fetch(request);
    }
    let dataList: Data[];
    if (this.onProcessedAsync) {
      const args = this.createCallbackArgument<APIProcessedCallbackArgument>({
        request: request,
        response: response,
      });
      await this.onProcessedAsync(args);
      dataList = args.results;
    } else {
      const json: IServerResponse<any> = await response.json();
      if (json?.sources) {
        dataList = json?.sources.map(
          (x) => new Data(x.options.tableName, x.data, x.options)
        );
      } else {
        const name = (await this.nameToken?.getValueAsync()) ?? "cms.api";
        dataList = [new Data(name, json)];
      }
    }

    dataList?.forEach((data) => {
      const source = new Source(data.id, data.rows, data.options);
      this.context.setSource(source);
    });
  }
}
