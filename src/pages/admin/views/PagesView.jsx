import { useEffect, useRef, useState } from 'react'
import { ActionButton, Panel } from '../../../components/admin/AdminUI'
import { adminApi } from '../../../services/adminApi'
import { notify } from '../../../utils/feedback'
import { slugify } from '../../../utils/slugs'

function PagesView() {
  const [pages, setPages] = useState([])
  const [selectedPage, setSelectedPage] = useState(null)
  const [editorMode, setEditorMode] = useState('visual') // 'visual' or 'html'
  const [isLoading, setIsLoading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [message, setMessage] = useState('')
  const visualEditorRef = useRef(null)

  const loadPages = async () => {
    setIsLoading(true)
    try {
      const response = await adminApi.list('/pages', { per_page: 100 })
      const list = response.data || []
      setPages(list)
    } catch (err) {
      notify(err.message || 'Failed to load pages', 'error')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadPages()
  }, [])

  useEffect(() => {
    if (selectedPage && editorMode === 'visual' && visualEditorRef.current) {
      if (visualEditorRef.current.innerHTML !== selectedPage.content) {
        visualEditorRef.current.innerHTML = selectedPage.content || ''
      }
    }
  }, [selectedPage, editorMode])

  const handleCreate = () => {
    setSelectedPage({
      title: '',
      slug: '',
      content: '<h2 class="text-2xl font-bold text-[#003F86] mb-4">New Page Section</h2>\n<p class="mb-4 text-blue-900 leading-7">Enter your direct page contents here...</p>',
      status: 'Active',
    })
    setEditorMode('visual')
    setMessage('')
  }

  const handleEdit = (page) => {
    setSelectedPage({ ...page })
    setEditorMode('visual')
    setMessage('')
  }

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this CMS page?')) return
    try {
      await adminApi.remove('/pages', id)
      notify('Page deleted successfully')
      loadPages()
    } catch (err) {
      notify(err.message || 'Failed to delete page', 'error')
    }
  }

  const updateField = (key, value) => {
    setSelectedPage((current) => {
      const next = { ...current, [key]: value }
      if (key === 'title' && !current.id && (!current.slug || current.slug === slugify(current.title))) {
        next.slug = slugify(value)
      }
      return next
    })
  }

  const handleVisualChange = () => {
    if (visualEditorRef.current) {
      const html = visualEditorRef.current.innerHTML
      setSelectedPage((current) => ({ ...current, content: html }))
    }
  }

  const execCommand = (command, value = null) => {
    if (!visualEditorRef.current) return
    visualEditorRef.current.focus()
    document.execCommand(command, false, value)
    handleVisualChange()
  }

  const handleInsertVideo = () => {
    const input = window.prompt('Enter Video URL (YouTube, Vimeo, MP4 link) or paste raw HTML <iframe> / <video> embed code:')
    if (!input || !input.trim()) return

    let videoHtml = input.trim()
    if (!videoHtml.startsWith('<')) {
      // Auto transform known video links into clean embedded tags
      const youtubeMatch = videoHtml.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/i)
      if (youtubeMatch && youtubeMatch[1]) {
        videoHtml = `<iframe class="w-full aspect-video rounded-lg my-6 shadow-md border border-blue-100" src="https://www.youtube.com/embed/${youtubeMatch[1]}" title="YouTube video player" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>`
      } else if (/\.(mp4|webm|ogg)$/i.test(videoHtml)) {
        videoHtml = `<video controls class="w-full aspect-video rounded-lg my-6 shadow-md bg-black" src="${videoHtml}"></video>`
      } else {
        // Fallback generic iframe
        videoHtml = `<iframe class="w-full aspect-video rounded-lg my-6 shadow-md border border-blue-100" src="${videoHtml}" frameborder="0" allowfullscreen></iframe>`
      }
    }

    if (editorMode === 'visual') {
      if (visualEditorRef.current) {
        visualEditorRef.current.focus()
        document.execCommand('insertHTML', false, `${videoHtml}<p><br></p>`)
        handleVisualChange()
      }
    } else {
      updateField('content', `${selectedPage?.content || ''}\n${videoHtml}\n`)
    }
  }

  const handleSave = async (e) => {
    e.preventDefault()
    if (!selectedPage.title || !selectedPage.slug || !selectedPage.content) {
      notify('Title, slug, and content are required.', 'error')
      return
    }

    setIsSaving(true)
    setMessage('')
    try {
      if (selectedPage.id) {
        await adminApi.update('/pages', selectedPage.id, selectedPage)
        notify('Page updated successfully')
      } else {
        await adminApi.create('/pages', selectedPage)
        notify('Page created successfully')
      }
      setSelectedPage(null)
      loadPages()
    } catch (err) {
      notify(err.message || 'Failed to save page', 'error')
    } finally {
      setIsSaving(false)
    }
  }

  if (selectedPage) {
    return (
      <Panel
        actions={
          <ActionButton onClick={() => setSelectedPage(null)}>
            ← Back to Pages List
          </ActionButton>
        }
        subtitle="Configure title, URL slug, and formatting. You can visually edit or paste complete raw HTML directly."
        title={selectedPage.id ? `Edit Page: ${selectedPage.title}` : 'Create New CMS Page'}
      >
        <form className="mt-4 space-y-6 max-w-5xl" onSubmit={handleSave}>
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500">Page Title</label>
              <input
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-800 focus:border-[#003F86] focus:outline-none focus:ring-1 focus:ring-[#003F86]"
                onChange={(e) => updateField('title', e.target.value)}
                placeholder="e.g. Privacy Policy"
                required
                value={selectedPage.title || ''}
              />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500">URL Slug</label>
              <input
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-800 focus:border-[#003F86] focus:outline-none focus:ring-1 focus:ring-[#003F86]"
                onChange={(e) => updateField('slug', slugify(e.target.value))}
                placeholder="e.g. privacy-policy"
                required
                value={selectedPage.slug || ''}
              />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500">Status</label>
              <select
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-800 focus:border-[#003F86] focus:outline-none focus:ring-1 focus:ring-[#003F86]"
                onChange={(e) => updateField('status', e.target.value)}
                value={selectedPage.status || 'Active'}
              >
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
              </select>
            </div>
          </div>

          <div className="rounded-lg border border-slate-300 overflow-hidden shadow-sm bg-white">
            <div className="flex flex-wrap items-center justify-between border-b border-slate-200 bg-slate-50 px-4 py-2 gap-2">
              <div className="flex flex-wrap items-center gap-1">
                <button
                  type="button"
                  onClick={() => setEditorMode('visual')}
                  className={`px-3 py-1 text-xs font-bold rounded ${editorMode === 'visual' ? 'bg-[#003F86] text-white' : 'bg-slate-200 text-slate-700 hover:bg-slate-300'}`}
                >
                  Visual Editor
                </button>
                <button
                  type="button"
                  onClick={() => setEditorMode('html')}
                  className={`px-3 py-1 text-xs font-bold rounded ${editorMode === 'html' ? 'bg-[#003F86] text-white' : 'bg-slate-200 text-slate-700 hover:bg-slate-300'}`}
                >
                  Raw HTML / Source
                </button>
              </div>

              {editorMode === 'visual' && (
                <div className="flex flex-wrap items-center gap-1">
                  <button type="button" onClick={() => execCommand('formatBlock', '<h1>')} className="px-2 py-1 text-xs font-semibold rounded border bg-white hover:bg-slate-100" title="Heading 1">H1</button>
                  <button type="button" onClick={() => execCommand('formatBlock', '<h2>')} className="px-2 py-1 text-xs font-semibold rounded border bg-white hover:bg-slate-100" title="Heading 2">H2</button>
                  <button type="button" onClick={() => execCommand('formatBlock', '<h3>')} className="px-2 py-1 text-xs font-semibold rounded border bg-white hover:bg-slate-100" title="Heading 3">H3</button>
                  <span className="text-slate-300">|</span>
                  <button type="button" onClick={() => execCommand('bold')} className="px-2 py-1 text-xs font-bold rounded border bg-white hover:bg-slate-100" title="Bold">B</button>
                  <button type="button" onClick={() => execCommand('italic')} className="px-2 py-1 text-xs font-italic rounded border bg-white hover:bg-slate-100" title="Italic">I</button>
                  <button type="button" onClick={() => execCommand('underline')} className="px-2 py-1 text-xs underline rounded border bg-white hover:bg-slate-100" title="Underline">U</button>
                  <span className="text-slate-300">|</span>
                  <button type="button" onClick={() => execCommand('insertUnorderedList')} className="px-2 py-1 text-xs font-semibold rounded border bg-white hover:bg-slate-100" title="Bullet List">• List</button>
                  <button type="button" onClick={() => execCommand('insertOrderedList')} className="px-2 py-1 text-xs font-semibold rounded border bg-white hover:bg-slate-100" title="Numbered List">1. List</button>
                  <span className="text-slate-300">|</span>
                  <button
                    type="button"
                    onClick={() => {
                      const url = window.prompt('Enter link URL:')
                      if (url) execCommand('createLink', url)
                    }}
                    className="px-2 py-1 text-xs font-semibold rounded border bg-white hover:bg-slate-100 text-blue-600 underline"
                  >
                    Link
                  </button>
                  <button
                    type="button"
                    onClick={handleInsertVideo}
                    className="px-2 py-1 text-xs font-bold rounded bg-emerald-600 text-white hover:bg-emerald-700 ml-1 flex items-center gap-1 shadow-sm"
                  >
                    🎬 Insert Video / Embed
                  </button>
                </div>
              )}

              {editorMode === 'html' && (
                <div className="text-xs font-semibold text-slate-500 flex items-center gap-2">
                  <span>Paste complete HTML or style formatting directly.</span>
                  <button
                    type="button"
                    onClick={handleInsertVideo}
                    className="px-2 py-1 text-xs font-bold rounded bg-emerald-600 text-white hover:bg-emerald-700 ml-1"
                  >
                    🎬 Insert Video HTML
                  </button>
                </div>
              )}
            </div>

            {editorMode === 'visual' ? (
              <div
                ref={visualEditorRef}
                className="min-h-[360px] p-6 text-slate-800 text-base leading-7 outline-none prose max-w-none [&>h1]:text-3xl [&>h1]:font-bold [&>h1]:text-[#003F86] [&>h1]:mb-4 [&>h2]:text-2xl [&>h2]:font-bold [&>h2]:text-[#003F86] [&>h2]:mt-6 [&>h2]:mb-3 [&>h3]:text-xl [&>h3]:font-semibold [&>h3]:text-[#003F86] [&>h3]:mt-4 [&>h3]:mb-2 [&>p]:mb-4 [&>ul]:list-disc [&>ul]:list-inside [&>ul]:space-y-2 [&>ul]:mb-6 [&>ol]:list-decimal [&>ol]:list-inside [&>ol]:space-y-2 [&>ol]:mb-6 [&>a]:text-blue-600 [&>a]:underline [&>iframe]:w-full [&>iframe]:aspect-video [&>iframe]:rounded-lg [&>iframe]:my-6 [&>iframe]:shadow-md [&>video]:w-full [&>video]:aspect-video [&>video]:rounded-lg [&>video]:my-6 [&>video]:shadow-md"
                contentEditable
                onInput={handleVisualChange}
                onBlur={handleVisualChange}
              />
            ) : (
              <textarea
                className="w-full min-h-[360px] p-4 font-mono text-xs text-slate-800 bg-slate-900 text-emerald-400 focus:outline-none"
                onChange={(e) => updateField('content', e.target.value)}
                value={selectedPage.content || ''}
                placeholder="Paste or write your raw HTML code here..."
              />
            )}
          </div>

          {message && <p className="text-sm font-semibold text-emerald-600">{message}</p>}

          <div className="flex items-center gap-4 pt-2">
            <button
              className="rounded-lg bg-[#003F86] px-6 py-2.5 text-sm font-bold text-white shadow hover:bg-blue-900 disabled:opacity-50 transition"
              disabled={isSaving}
              type="submit"
            >
              {isSaving ? 'Saving Page...' : selectedPage.id ? 'Update CMS Page' : 'Create CMS Page'}
            </button>
            <button
              className="rounded-lg border border-slate-300 px-5 py-2.5 text-sm font-bold text-slate-600 hover:bg-slate-100 transition"
              onClick={() => setSelectedPage(null)}
              type="button"
            >
              Cancel
            </button>
          </div>
        </form>
      </Panel>
    )
  }

  return (
    <Panel
      actions={
        <button
          onClick={handleCreate}
          className="rounded-lg bg-[#003F86] px-4 py-2 text-sm font-bold text-white shadow hover:bg-blue-900 transition flex items-center gap-2"
        >
          + Add New Page
        </button>
      }
      subtitle="Manage static CMS content pages like Privacy Policy and Terms & Conditions directly with full HTML and video embed capability."
      title="Pages Management"
    >
      {isLoading ? (
        <div className="py-12 text-center text-slate-500 font-medium">Loading CMS pages...</div>
      ) : pages.length === 0 ? (
        <div className="py-12 text-center text-slate-500">
          <p className="font-semibold text-base">No CMS pages found.</p>
          <p className="mt-1 text-sm text-slate-400">Click &apos;+ Add New Page&apos; above to build your first legal or content page.</p>
        </div>
      ) : (
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {pages.map((page) => (
            <div key={page.id} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm hover:shadow transition flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between">
                  <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${page.status === 'Active' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-700'}`}>
                    {page.status}
                  </span>
                  <span className="text-xs text-slate-400 font-mono">/{page.slug}</span>
                </div>
                <h3 className="mt-3 text-lg font-bold text-slate-900 truncate">{page.title}</h3>
                <p className="mt-2 text-xs text-slate-500 line-clamp-3">
                  {String(page.content || '').replace(/<[^>]*>?/gm, '') || 'No content preview available'}
                </p>
              </div>
              <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <a
                  href={`/${page.slug}`}
                  target="_blank"
                  rel="noreferrer"
                  className="px-3 py-1.5 text-xs font-semibold text-blue-700 hover:bg-blue-50 rounded transition"
                >
                  Preview Page ↗
                </a>
                <button
                  onClick={() => handleEdit(page)}
                  className="px-3 py-1.5 text-xs font-bold bg-slate-100 text-slate-700 hover:bg-slate-200 rounded transition"
                >
                  Edit Content
                </button>
                <button
                  onClick={() => handleDelete(page.id)}
                  className="px-2.5 py-1.5 text-xs font-bold text-red-600 hover:bg-red-50 rounded transition"
                  title="Delete Page"
                >
                  🗑
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </Panel>
  )
}

export default PagesView
