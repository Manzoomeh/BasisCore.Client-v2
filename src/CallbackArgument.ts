import IContext from "./context/IContext";
import Data from "./data/Data";

export declare type CallbackArgument = {
  context: IContext;
  node: Node;
};

export declare type RenderingCallbackArgument = CallbackArgument & {
  prevent: boolean;
};

export declare type RenderedCallbackArgument = CallbackArgument & {
  rendered: boolean;
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
