import { inject, injectable } from "tsyringe";
import {
  APIProcessedCallbackArgument,
  APIProcessingCallbackArgument,
} from "../../CallbackArgument";
import IContext from "../../context/IContext";
import Data from "../../data/Data";
import Source from "../../data/Source";
import IToken from "../../token/IToken";
import { HttpMethod, ServerResponse } from "../../type-alias";
import SourceComponent from "./SourceComponent";

@injectable()
export default class APIComponent extends SourceComponent {
  readonly urlToken: IToken<string>;
  readonly methodToken: IToken<string>;
  readonly bodyToken: IToken<string>;
  readonly nameToken: IToken<string>;
  constructor(
    @inject("element") element: Element,
    @inject("context") context: IContext
  ) {
    super(element, context);
    this.urlToken = this.getAttributeToken("url");
    this.methodToken = this.getAttributeToken("method");
    this.bodyToken = this.getAttributeToken("body");
    this.nameToken = this.getAttributeToken("name");
  }

  protected async runAsync(): Promise<boolean> {
    const method = (
      await this.methodToken?.getValueAsync()
    )?.toUpperCase() as HttpMethod;
    const url = await this.urlToken?.getValueAsync();
    let response: Response;
    const body = await this.bodyToken?.getValueAsync();
    const init: RequestInit = {
      method: method,
      headers: {
        "Content-Type": "application/json",
      },
      body: body,
    };
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
      const json: ServerResponse = await response.json();
      if (typeof json?.sources === "object") {
        dataList = Object.keys(json?.sources)
          .map((key) => {
            return {
              key: key,
              data: json.sources[key],
            };
          })
          .map((x) => new Data(x.key, x.data.data, x.data.mergeType));
      } else {
        const name = await this.nameToken.getValueAsync();
        dataList = [new Data(name, json)];
      }
    }

    dataList?.forEach((data) => {
      const source = new Source(data.id, data.rows, data.mergeType);
      this.context.setSource(source);
    });
    return true;
  }
}
