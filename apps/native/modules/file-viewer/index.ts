import { requireOptionalNativeModule } from "expo";

type FileViewerModule = { open(uri: string, mimeType: string): boolean };

// Missing on iOS, in Expo Go, and before a new development build.
const native = requireOptionalNativeModule<FileViewerModule>("FileViewer");

/** Opens a content:// URI in a viewer app. False when that isn't possible here. */
export function openFile(uri: string, mimeType: string): boolean {
  return native ? native.open(uri, mimeType) : false;
}
