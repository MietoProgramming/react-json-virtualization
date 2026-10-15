import { installDocumentWorker } from "react-json-virtualization/worker";

installDocumentWorker(self as unknown as Parameters<typeof installDocumentWorker>[0]);
