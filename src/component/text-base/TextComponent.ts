import IContext from "../../context/IContext";
import ISource from "../../data/ISource";
import { Priority } from "../../enum";
import IToken from "../../token/IToken";
import Component from "../Component";

export default class TextComponent extends Component<Node> {
  readonly token: IToken<string>;
  readonly content: DocumentFragment;
  readonly range: Range;
  readonly priority: Priority = Priority.none;

  constructor(node: Node, context: IContext, start: number, end: number) {
    super(node, context);
    this.range = document.createRange();
    this.range.setStart(node, start);
    this.range.setEnd(node, end);
    this.content = this.range.extractContents();
    this.token = this.content.textContent.ToStringToken(context);
  }

  public async initializeAsync(): Promise<void> {
    this.addTrigger(this.token.getSourceNames());
    const value = await this.token.getValueAsync(false);
    this.setContent(value ?? "");
  }

  public async renderAsync(source?: ISource): Promise<void> {
    const content = await this.token.getValueAsync();
    this.setContent(content);
  }

  protected async setContent(content: string) {
    let fragment = this.range.createContextualFragment(content);
    this.range.deleteContents();
    this.range.insertNode(fragment);
  }

  public disposeAsync(): Promise<void> {
    this.range.detach();
    return super.disposeAsync();
  }
}
