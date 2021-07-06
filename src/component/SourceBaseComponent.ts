import IContext from "../context/IContext";
import ISource from "../data/ISource";
import { Priority } from "../enum";
import IToken from "../token/IToken";
import { SourceId } from "../type-alias";
import CommandComponent from "./CommandComponent";

export default abstract class SourceBaseComponent extends CommandComponent {
  private sourceId: SourceId;
  readonly range: Range;
  readonly content: DocumentFragment;
  //private _dataSource: ISource;
  private manipulationToken: IToken<string>;
  readonly priority: Priority = Priority.None;

  constructor(element: Element, context: IContext) {
    super(element, context);
    this.range = document.createRange();
    this.range.selectNode(element);
    this.content = this.range.extractContents();
    this.manipulationToken = this.node.GetStringToken(
      "OnProcessing",
      this.context
    );
  }

  public async initializeAsync(): Promise<void> {
    await super.initializeAsync();
    this.sourceId = await this.getAttributeValueAsync("dataMemberName");
    this.addTrigger([this.sourceId]);
    // this.context.addOnSourceSetHandler(
    //   this.sourceId,
    //   this.onDataSourceAdded.bind(this)
    // );
    //console.log(`${this.core} - initializeAsync`);
  }

  protected abstract renderSourceAsync(dataSource: ISource): Promise<void>;

  public async processAsync(): Promise<void> {
    const oldSource = this.context.tryToGetSource(this.sourceId);
    if (oldSource) {
      await super.processAsync();
    }
  }

  public async runAsync(): Promise<boolean> {
    let rendered = false;
    // let oldSource = this._dataSource;
    // this._dataSource = null;
    // if (!oldSource) {
    //   oldSource = await this.context.waitToGetSourceAsync(this.sourceId);
    // }
    //console.log(`${this.core} - runAsync`);
    let oldSource = this.context.tryToGetSource(this.sourceId);
    console.log(oldSource, this.sourceId);
    if (oldSource) {
      const manipulation = await this.manipulationToken?.getValueAsync();
      if (manipulation) {
        const manipulationFn = new Function(
          "source",
          "context",
          `return ${manipulation}(source,context);`
        );
        const result = manipulationFn(oldSource, this.context);
        oldSource = result instanceof Promise ? await result : result;
      }
      await this.renderSourceAsync(oldSource);
      rendered = true;
    }
    return rendered;
  }

  // private onDataSourceAdded(dataSource: ISource): void {
  //   this._dataSource = dataSource;
  //   this.processAsync();
  // }

  protected setContent(newContent: Node) {
    this.range.deleteContents();
    this.range.insertNode(newContent);
  }
}
