import { injectable } from "tsyringe";
import IContext from "../../context/IContext";
import NonSourceBaseCommand from "../NonSourceBaseCommand";

//https://developer.mozilla.org/en-US/docs/Web/HTTP/Cookies
//https://developer.mozilla.org/en-US/docs/Web/API/Document/cookie
//https://www.w3schools.com/js/js_cookies.asp

@injectable()
export default class Cookie extends NonSourceBaseCommand {
  constructor(element: Element) {
    super(element);
  }
  public async runAsync(context: IContext): Promise<string> {
    var name = await this.getAttributeValueAsync("name", context);
    var value = await this.getAttributeValueAsync("value", context);
    var maxAge = await this.getAttributeValueAsync("max-age", context);
    var path = await this.getAttributeValueAsync("path", context);

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
