import IContext from "../../context/IContext";
import IToken from "../../token/IToken";
import RangeableComponent from "../RangeableComponent";

export default class TextComponent extends RangeableComponent<Node> {
  readonly token: IToken<string>;
  readonly content: DocumentFragment;

  constructor(node: Node, context: IContext, start: number, end: number) {
    super(node, context, start, end);
    this.content = this.range.extractContents();
    this.token = this.content.textContent.ToStringToken(context);
    this.addTrigger(this.token.getSourceNames());
  }

  public async initializeAsync(): Promise<void> {
    const value = await this.token.getValueAsync(false);
    this.setContent(value ?? "");
  }

  public async renderAsync(): Promise<void> {
    const content = await this.token.getValueAsync();
    this.setContent(content);
  }

  protected async setContent(content: string) {
    let fragment = this.range.createContextualFragment(content);
    this.range.deleteContents();
    this.range.insertNode(fragment);
  }
}
