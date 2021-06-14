import IContext from "../context/IContext";
import ISource from "../data/ISource";
import { AppendType } from "../enum";
import IToken from "../token/IToken";
import { SourceId } from "../type-alias";
import CommandComponent from "./CommandComponent";

export default abstract class SourceBaseComponent extends CommandComponent {
  private sourceId: SourceId;
  readonly range: Range;
  readonly content: DocumentFragment;
  private _dataSource: ISource;
  private manipulationToken: IToken<string>;
  private appendTypeToken: IToken<string>;

  constructor(element: Element, context: IContext) {
    super(element, context);
    this.range = document.createRange();
    this.range.selectNode(element);
    this.content = this.range.extractContents();
    this.manipulationToken = this.node.GetStringToken(
      "bc-pre-process",
      this.context
    );
    this.appendTypeToken = this.node.GetStringToken(
      "bc-append-type",
      this.context
    );
  }

  public async initializeAsync(): Promise<void> {
    await super.initializeAsync();
    this.sourceId = await this.getAttributeValueAsync("datamembername");
    this.context.addOnSourceSetHandler(
      this.sourceId,
      this.onDataSourceAdded.bind(this)
    );
    //console.log(`${this.core} - initializeAsync`);
  }

  protected abstract renderSourceAsync(
    dataSource: ISource,
    appendType: AppendType
  ): Promise<void>;

  public async runAsync(): Promise<void> {
    let oldSource = this._dataSource;
    this._dataSource = null;
    if (!oldSource) {
      oldSource = await this.context.waitToGetSourceAsync(this.sourceId);
    }
    //console.log(`${this.core} - runAsync`);
    const appendTypeStr = await this.appendTypeToken?.getValueAsync();
    let oldAppendType = appendTypeStr
      ? AppendType[appendTypeStr]
      : AppendType.replace;
    const manipulation = await this.manipulationToken?.getValueAsync();
    if (manipulation) {
      const manipulationFn = new Function(
        "source",
        "context",
        "appendType",
        `return ${manipulation}(source,context,appendType);`
      );
      const result = manipulationFn(oldSource, this.context, oldAppendType);
      let { source = oldSource, appendType = oldAppendType } =
        result instanceof Promise ? await result : result;
      oldSource = source;
      oldAppendType = appendType;
    }
    await this.renderSourceAsync(oldSource, oldAppendType);
  }

  private onDataSourceAdded(dataSource: ISource): void {
    this._dataSource = dataSource;
    this.processAsync();
  }

  protected setContent(newContent: Node, appendType: AppendType) {
    switch (appendType) {
      case AppendType.after: {
        const currentContent = this.range.extractContents();
        currentContent.appendChild(newContent);
        this.range.insertNode(currentContent);
        break;
      }
      case AppendType.before: {
        this.range.insertNode(newContent);
        break;
      }
      default: {
        this.range.deleteContents();
        this.range.insertNode(newContent);
        break;
      }
    }
  }
}
