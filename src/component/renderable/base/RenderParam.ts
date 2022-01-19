import ISource from "../../../data/ISource";
import { FaceRowType } from "../../../enum";
import FaceRenderResult from "./FaceRenderResult";
import FaceRenderResultRepository from "./FaceRenderResultRepository";

export default class RenderParam<TRenderResult extends FaceRenderResult> {
  Levels: string[];
  _renderedCount: number;
  readonly groupName?: string;
  readonly source: ISource;
  readonly factory: RenderResultFactory;
  readonly renderResultRepository: FaceRenderResultRepository<TRenderResult>;

  get rowType(): FaceRowType {
    return this._renderedCount % 2 == 0 ? FaceRowType.Even : FaceRowType.Odd;
  }

  constructor(
    source: ISource,
    renderResultRepository: FaceRenderResultRepository<TRenderResult>,
    renderResultFactory: RenderResultFactory,
    groupName?: string
  ) {
    this.source = source;
    this.renderResultRepository = renderResultRepository;
    this.factory = renderResultFactory;
    this.groupName = groupName;
    this._renderedCount = 0;
  }

  public async getRenderedResultAsync(
    data: any
  ): Promise<[any, number, TRenderResult]> {
    const dataKey = this.getKeyValue(data);
    const newVersion = this.source.getVersion(data);
    let savedResult = this.renderResultRepository?.get(dataKey, this.groupName);
    if (savedResult) {
      if (newVersion !== savedResult.version) {
        savedResult = null;
      }
    }
    return [dataKey, newVersion, savedResult];
  }

  public getKeyValue(data: any): any {
    return this.source.keyFieldName
      ? Reflect.get(data, this.source.keyFieldName)
      : data;
  }

  public setLevel(levels: string[]) {
    this.Levels = levels;
  }

  public setRendered(): void {
    this._renderedCount++;
  }

  public setIgnored() {
    this._renderedCount--;
  }
}

declare type RenderResultFactory = (
  key: any,
  version: number,
  node: Element
) => any;
