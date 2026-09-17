import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/upload/picture/$kind/$assetId/$fileName')({
  server: {
    handlers: {
      GET: async ({ params }) => {
        const { servePredisposedPicture } = await import('@backend/server/assets/predisposed-picture.server');
        return servePredisposedPicture(params.kind, params.assetId, params.fileName);
      },
    },
  },
});
