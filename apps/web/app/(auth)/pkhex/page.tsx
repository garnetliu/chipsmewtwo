import type { Metadata } from "next";

import { LicenseNotice } from "@/app/(auth)/pkhex/component/license-notice";
import { SaveEditor } from "@/app/(auth)/pkhex/component/save-editor";

export const metadata: Metadata = {
  title: "存档编辑器",
  description: "在浏览器里直接改宝可梦存档，文件不上传",
};

export default function PkhexPage() {
  return (
    <>
      <SaveEditor />
      {/* GPL 要求分发方提供源码入口，见 LicenseNotice 的注释。不要删 */}
      <div className="container mx-auto pb-4">
        <LicenseNotice />
      </div>
    </>
  );
}
