import BasisCore from "./BasisCore";
import { BCWrapper } from "./BCWrapper";
import DataUtil from "./data/DataUtil";
import ISource from "./data/ISource";
import Source from "./data/Source";
import { AppendType, SourceType } from "./enum";
import IBasisCore from "./IBasisCore";
import { SourceId } from "./type-alias";

export default class BCLinker {
  private cors: Array<IBasisCore> = new Array<IBasisCore>();
  private filter: Array<SourceId> = new Array<SourceId>();

  public add(...wrappers: BCWrapper[]): BCLinker {
    wrappers.forEach((wrapper) => {
      if (wrapper.basiscore) {
        this.addBC(wrapper.basiscore);
      } else {
        wrapper.manager.Add((x) => this.addBC(x));
      }
    });
    return this;
  }

  public remove(...wrappers: BCWrapper[]) {
    wrappers.forEach((wrapper) => {
      if (wrapper.basiscore) {
        const index = this.cors.indexOf(wrapper.basiscore);
        if (index != -1) {
          this.cors.splice(index, 1);
        }
      } else {
        throw "Operation not supported";
      }
    });
  }

  private addBC(bc: IBasisCore) {
    bc.context.onDataSourceSet.Add(this.onSourceSet.bind(this, bc));
    this.cors.push(bc);
  }

  private onSourceSet(basisCore: BasisCore, source: ISource): Promise<void> {
    return new Promise<void>((res) => {
      if (
        source.type == SourceType.internal &&
        this.filter.indexOf(source.data.id) == -1
      ) {
        var newSource = new Source(
          source.data,
          source.appendType,
          SourceType.external
        );
        this.cors
          .filter((x) => x != basisCore)
          .forEach((core) => core.context.setSource(newSource));
      }
      res();
    });
  }

  public addFilter(...filter: SourceId[]): BCLinker {
    this.filter.push(...filter);
    return this;
  }

  public setSource(
    sourceId: SourceId,
    data: any,
    appendType: AppendType
  ): BCLinker {
    const source = DataUtil.ToDataSource(sourceId, data, appendType);
    this.cors.forEach((core) => core.context.setSource(source));
    return this;
  }
}