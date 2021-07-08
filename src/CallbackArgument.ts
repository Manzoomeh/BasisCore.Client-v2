import IContext from "./context/IContext";
import Data from "./data/Data";
import ISource from "./data/ISource";

export declare type CallbackArgument = {
  context: IContext;
  node: Node;
};

export declare type RenderingCallbackArgument = CallbackArgument & {
  prevent: boolean;
  source?: ISource;
};

export declare type RenderedCallbackArgument = CallbackArgument & {
  rendered: boolean;
  source?: ISource;
};

export declare type APIProcessingCallbackArgument = CallbackArgument & {
  request: Request;
  response: Promise<Response> | Response;
};

export declare type APIProcessedCallbackArgument = CallbackArgument & {
  request: Request;
  response: Response;
  results: Data[];
};

export declare type HtmlCallbackArgument = CallbackArgument & {
  id: string;
  value: any;
};
