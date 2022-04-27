import IDictionary from "../IDictionary";

export default interface IPushOptions {
  applicationServerKey: string;
  url: string;
  params: IDictionary<string>;
}
