import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/upload/$year/dispose/picture/$assetId/$fileName')({
  server: {
    handlers: {
      GET: async ({ params }) => {
        const { serveDisposalAssetPicture } = await import('@backend/server/assets/predisposed-picture.server');
        return serveDisposalAssetPicture(params.year, params.assetId, params.fileName);
      },
    },
  },
});
