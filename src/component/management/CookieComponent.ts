import { inject, injectable } from "tsyringe";
import IContext from "../../context/IContext";
import NonSourceBaseComponent from "../NonSourceBaseComponent";

//https://developer.mozilla.org/en-US/docs/Web/HTTP/Cookies
//https://developer.mozilla.org/en-US/docs/Web/API/Document/cookie
//https://www.w3schools.com/js/js_cookies.asp

@injectable()
export default class CookieComponent extends NonSourceBaseComponent {
  constructor(
    @inject("element") element: Element,
    @inject("context") context: IContext
  ) {
    super(element, context);
    const range = document.createRange();
    range.selectNode(element);
    range.deleteContents();
  }
  public initializeAsync(): Promise<void> {
    return super.initializeAsync();
  }
  public async runAsync(): Promise<void> {
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
