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
  protected async runAsync(): Promise<void> {
    var name = await this.getAttributeValueAsync("name");
    var value = await this.getAttributeValueAsync("value");
    var maxAge = await this.getAttributeValueAsync("max-age");
    var path = await this.getAttributeValueAsync("path");

    var str = `${name.trim()}=${value || ""}`;
    if (maxAge) {
      str += `;max-age=${maxAge}`;
    }
    if (path) {
      str += `;path=${path.trim()}`;
    }
    document.cookie = str;
  }
}
