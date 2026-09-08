import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/upload/dispose/$year/$batch/$fileName')({
  server: {
    handlers: {
      GET: async ({ params }) => {
        const { serveDisposalImage } = await import('@backend/server/assets/disposal-image.server');
        return serveDisposalImage(params.year, params.batch, params.fileName);
      },
    },
  },
});
