import FaceRenderResult from "./FaceRenderResult";

export declare type RenderResultSelector<
  TRenderResult extends FaceRenderResult
> = <TRenderResult>(
  data: any,
  key: any,
  groupName?: string
) => Promise<TRenderResult>;
