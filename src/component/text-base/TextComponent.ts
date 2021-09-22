import IContext from "../../context/IContext";
import ISource from "../../data/ISource";
import { Priority } from "../../enum";
import RangeObject from "../../RangeObject/RangeObject";
import IToken from "../../token/IToken";
import Component from "../Component";

export default class TextComponent extends Component<Node> {
  readonly token: IToken<string>;
  readonly rangeObject: RangeObject;
  readonly priority: Priority = Priority.none;

  constructor(node: Node, context: IContext, start: number, end: number) {
    super(node, context);
    const range = document.createRange();
    range.setStart(node, start);
    range.setEnd(node, end);
    const content = range.extractContents();
    this.rangeObject = new RangeObject(range, this);
    this.token = content.textContent.ToStringToken(context);
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
    this.rangeObject.setContent(content);
  }
}
