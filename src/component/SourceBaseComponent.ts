import { SourceCallbackArgument } from "../CallbackArgument";
import IContext from "../context/IContext";
import ISource from "../data/ISource";
import { SourceId } from "../type-alias";
import CommandComponent from "./CommandComponent";

export default abstract class SourceBaseComponent extends CommandComponent {
  private sourceId: SourceId;

  constructor(element: Element, context: IContext) {
    super(element, context);
  }

  public async processAsync(): Promise<void> {
    this.sourceId = (
      await this.getAttributeValueAsync("dataMemberName")
    )?.toLowerCase();
    this.addTrigger([this.sourceId]);
    await super.processAsync();
  }

  public async runAsync(source?: ISource): Promise<any> {
    let result: any = null;
    if (source?.id !== this.sourceId) {
      source = this.context.tryToGetSource(this.sourceId);
    }
    if (source) {
      if (this.onProcessingAsync) {
        const args = this.createCallbackArgument<SourceCallbackArgument>({
          source: source,
        });
        await this.onProcessingAsync(args);
        source = args.source;
      }
      result = await this.renderSourceAsync(source);
    }
    return result;
  }

  protected setContent(newContent: Node, append: boolean) {
    if (append) {
      if (newContent) {
        const currentContent = this.range.extractContents();
        currentContent.appendChild(newContent);
        this.range.insertNode(currentContent);
      }
    } else {
      this.range.deleteContents();
      if (newContent) {
        this.range.insertNode(newContent);
      }
    }
  }

  protected abstract renderSourceAsync(dataSource: ISource): Promise<any>;
}
