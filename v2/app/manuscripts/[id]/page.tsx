import { prisma } from '@/lib/db'
import { notFound } from 'next/navigation'

export default async function ManuscriptPage({
  params,
}: {
  params: { id: string }
}) {
  const manuscript = await prisma.manuscript.findUnique({
    where: { id: params.id },
    include: {
      _count: {
        select: {
          citations: true,
          references: true,
        },
      },
    },
  })

  if (!manuscript) {
    notFound()
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-lg shadow p-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            {manuscript.title}
          </h1>
          <p className="text-gray-600 mb-6">by {manuscript.authorName}</p>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <div className="bg-gray-50 p-4 rounded">
              <div className="text-2xl font-bold text-blue-600">
                {manuscript._count.citations}
              </div>
              <div className="text-sm text-gray-600">Citations</div>
            </div>
            <div className="bg-gray-50 p-4 rounded">
              <div className="text-2xl font-bold text-green-600">
                {manuscript._count.references}
              </div>
              <div className="text-sm text-gray-600">References</div>
            </div>
            <div className="bg-gray-50 p-4 rounded">
              <div className="text-2xl font-bold text-purple-600">
                {manuscript.fileType.toUpperCase()}
              </div>
              <div className="text-sm text-gray-600">File Type</div>
            </div>
            <div className="bg-gray-50 p-4 rounded">
              <div className="text-2xl font-bold text-orange-600 capitalize">
                {manuscript.status}
              </div>
              <div className="text-sm text-gray-600">Status</div>
            </div>
          </div>

          <div className="space-y-4">
            <h2 className="text-xl font-semibold text-gray-900">Next Steps</h2>
            <ol className="list-decimal list-inside space-y-2 text-gray-700">
              <li>Analyze document for citations and references</li>
              <li>Assign RIDs and capture context</li>
              <li>Discover URLs for each reference</li>
              <li>Generate publication formats</li>
            </ol>

            <div className="pt-4">
              <button
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                disabled
              >
                Start Analysis (Coming Soon)
              </button>
            </div>
          </div>
        </div>

        <div className="mt-4 text-center">
          <a href="/" className="text-blue-600 hover:underline">
            ← Upload Another Manuscript
          </a>
        </div>
      </div>
    </div>
  )
}
