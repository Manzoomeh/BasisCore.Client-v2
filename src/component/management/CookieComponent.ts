import { inject, injectable } from "tsyringe";
import { NonSourceBaseComponent } from "../NonSourceBaseComponent";
import IContext from "../../context/IContext";

//https://developer.mozilla.org/en-US/docs/Web/HTTP/Cookies
//https://developer.mozilla.org/en-US/docs/Web/API/Document/cookie
//https://www.w3schools.com/js/js_cookies.asp

@injectable()
export default class CookieComponent extends NonSourceBaseComponent {
  constructor(element: Element, @inject("IContext") context: IContext) {
    super(element, context);
  }
  public async runAsync(): Promise<string> {
    var name = await this.getAttributeValueAsync("name", this.context);
    var value = await this.getAttributeValueAsync("value", this.context);
    var maxAge = await this.getAttributeValueAsync("max-age", this.context);
    var path = await this.getAttributeValueAsync("path", this.context);

    var str = `${name.trim()}=${value || ""}`;
    if (maxAge) {
      str += `;max-age=${maxAge}`;
    }
    if (path) {
      str += `;path=${path.trim()}`;
    }
    document.cookie = str;
    return "";
  }
}
