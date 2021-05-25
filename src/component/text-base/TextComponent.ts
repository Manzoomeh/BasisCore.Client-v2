import IContext from "../../context/IContext";
import IToken from "../../token/IToken";
import RangeableComponent from "../RangeableComponent";

export default class TextComponent extends RangeableComponent<Node> {
  private readonly initializeTask: Promise<void>;
  readonly token: IToken<string>;
  readonly content: DocumentFragment;

  constructor(node: Node, context: IContext, start: number, end: number) {
    super(node, context, start, end);
    this.content = this.range.extractContents();
    this.token = this.content.textContent.ToStringToken(context);
    this.addTrigger(this.token.getSourceNames());
    this.initializeTask = this.token
      .getValueAsync(false)
      .then((defaultVal) => this.setContent(defaultVal ?? ""));
  }

  public initializeAsync(): Promise<void> {
    return this.initializeTask;
  }

  protected onTrigger(): void {
    this.token.getValueAsync().then((x) => {
      this.setContent(x);
    });
  }

  preContent: string = "";
  protected async setContent(content: string, replace: boolean = true) {
    if (replace) {
      this.preContent = "";
    }
    this.preContent += content;
    let fragment = this.range.createContextualFragment(this.preContent);
    this.range.deleteContents();
    this.range.insertNode(fragment);
  }
}
