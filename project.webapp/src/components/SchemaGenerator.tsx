import React, { useMemo, useState } from 'react';
import { Copy as CopyIcon, Trash2 as TrashIcon, ExternalLink as ExternalLinkIcon } from 'lucide-react';

type SchemaType = 'article' | 'author' | 'faq';

interface ArticleFormState {
  url: string;
  articleType: 'Article' | 'NewsArticle' | 'BlogPosting';
  headline: string;
  description: string;
  images: string[];
  authorType: 'Person' | 'Organization' | '';
  authorName: string;
  authorUrl: string;
  publisherName: string;
  publisherLogo: string;
  datePublished: string;
  dateModified: string;
}

interface AuthorFormState {
  name: string;
  url: string;
  image: string;
  jobTitle: string;
  worksFor: string;
  sameAsList: string[];
}

interface FaqItem {
  question: string;
  answer: string;
}

interface SchemaGeneratorProps {
  initialType?: SchemaType;
}

export function SchemaGenerator({ initialType = 'article' }: SchemaGeneratorProps) {
  const [schemaType, setSchemaType] = useState<SchemaType>(initialType);

  const [article, setArticle] = useState<ArticleFormState>({
    url: '',
    articleType: 'Article',
    headline: '',
    description: '',
    images: [''],
    authorType: '',
    authorName: '',
    authorUrl: '',
    publisherName: '',
    publisherLogo: '',
    datePublished: '',
    dateModified: ''
  });

  const [author, setAuthor] = useState<AuthorFormState>({
    name: '',
    url: '',
    image: '',
    jobTitle: '',
    worksFor: '',
    sameAsList: []
  });

  const [faq, setFaq] = useState<FaqItem[]>([
    { question: '', answer: '' }
  ]);

  const jsonLdObject = useMemo(() => {
    if (schemaType === 'article') {
      const imageList = (article.images || []).map(s => s.trim()).filter(Boolean);
      const firstImage = imageList.length > 0 ? imageList[0] : '';
      const authorType = article.authorType || '';
      const result: any = {
        '@context': 'https://schema.org',
        '@type': article.articleType,
        headline: article.headline || '',
        description: article.description || '',
        image: firstImage,
        author: {
          '@type': authorType,
          name: article.authorName || ''
        },
        publisher: {
          '@type': 'Organization',
          name: article.publisherName || '',
          logo: {
            '@type': 'ImageObject',
            url: article.publisherLogo || ''
          }
        },
        datePublished: article.datePublished || ''
      };
      if (article.authorUrl) {
        result.author.url = article.authorUrl;
      }
      if (article.dateModified) {
        result.dateModified = article.dateModified;
      }
      return result;
    }

    if (schemaType === 'author') {
      const obj: any = {
        '@context': 'https://schema.org/',
        '@type': 'Person',
        name: author.name || ''
      };
      if (author.url) obj.url = author.url;
      if (author.image) obj.image = author.image;
      if (author.jobTitle) obj.jobTitle = author.jobTitle;
      if (author.worksFor) {
        obj.worksFor = { '@type': 'Organization', name: author.worksFor };
      }
      if ((author.sameAsList || []).length) obj.sameAs = author.sameAsList;
      return obj;
    }

    // faq
    const items = (faq && faq.length > 0 ? faq : [{ question: '', answer: '' }]).map(item => ({
      '@type': 'Question',
      name: item.question || '',
      acceptedAnswer: { '@type': 'Answer', text: item.answer || '' }
    }));
    const mainEntity: any = items.length === 1 ? items[0] : items;
    return {
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity
    };
  }, [schemaType, article, author, faq]);

  const wrapScript = true;
  const jsonLdString = useMemo(() => JSON.stringify(jsonLdObject, null, 2), [jsonLdObject]);

  const copyJson = async () => {
    const scriptWrapped = wrapScript ? `<script type="application/ld+json">\n${jsonLdString}\n<\/script>` : jsonLdString;
    try {
      await navigator.clipboard.writeText(scriptWrapped);
      // eslint-disable-next-line no-alert
      alert('JSON-LD copied to clipboard');
    } catch (e) {
      // eslint-disable-next-line no-alert
      alert('Failed to copy');
    }
  };

  const clearSchema = () => {
    if (schemaType === 'article') {
      setArticle({
        url: '',
        articleType: 'Article',
        headline: '',
        description: '',
        images: [''],
        authorType: '',
        authorName: '',
        authorUrl: '',
        publisherName: '',
        publisherLogo: '',
        datePublished: '',
        dateModified: ''
      });
    } else if (schemaType === 'author') {
      setAuthor({ name: '', url: '', image: '', jobTitle: '', worksFor: '', sameAsList: [] });
    } else if (schemaType === 'faq') {
      setFaq([{ question: '', answer: '' }]);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col lg:flex-row gap-4 lg:items-center">
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium text-gray-700">Schema Type</label>
          <select
            className="border border-gray-300 rounded-md px-3 py-2 text-sm"
            value={schemaType}
            onChange={e => setSchemaType(e.target.value as SchemaType)}
          >
            <option value="article">Article</option>
            <option value="author">Author</option>
            <option value="faq">FAQ</option>
          </select>
        </div>
        
        {/* Action buttons moved to preview header as icons */}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white border rounded-lg p-4 space-y-4">
          {schemaType === 'article' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Article @type</label>
                  <select
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                    value={article.articleType}
                    onChange={e => setArticle({ ...article, articleType: e.target.value as 'Article' | 'NewsArticle' | 'BlogPosting' })}
                  >
                    <option value="Article">Article</option>
                    <option value="NewsArticle">NewsArticle</option>
                    <option value="BlogPosting">BlogPosting</option>
                  </select>
                </div>
                <TextField label="URL" value={article.url} onChange={v => setArticle({ ...article, url: v })} placeholder="https://example.com/article" />
                <TextField label="Headline" value={article.headline} onChange={v => setArticle({ ...article, headline: v })} maxLength={110} />
              </div>

              <div className="space-y-2">
                <div className="text-sm font-medium text-gray-700">Images</div>
                <div className="space-y-2">
                  {article.images.map((img, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <input
                        type="text"
                        className="flex-1 border border-gray-300 rounded-md px-3 py-2 text-sm"
                        placeholder="https://example.com/image.jpg"
                        value={img}
                        onChange={e => setArticle({ ...article, images: article.images.map((it, i) => i === idx ? e.target.value : it) })}
                      />
                      <button
                        type="button"
                        className="text-xs border border-gray-300 rounded px-2 py-1 hover:bg-gray-50"
                        onClick={() => setArticle({ ...article, images: article.images.map((it, i) => i === idx ? '' : it) })}
                      >
                        Clear
                      </button>
                      {article.images.length > 1 && (
                        <button
                          type="button"
                          className="text-xs text-red-600 hover:underline"
                          onClick={() => setArticle({ ...article, images: article.images.filter((_, i) => i !== idx) })}
                        >
                          Remove
                        </button>
                      )}
                    </div>
                  ))}
                </div>
                <button
                  type="button"
                  className="inline-flex items-center justify-center rounded-md border border-gray-300 px-3 py-2 text-sm hover:bg-gray-50"
                  onClick={() => setArticle({ ...article, images: [...article.images, ''] })}
                >
                  + Image
                </button>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Short description of the article</label>
                <textarea
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm min-h-[96px]"
                  value={article.description}
                  onChange={e => setArticle({ ...article, description: e.target.value })}
                  placeholder="Short description of the article"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Author @type</label>
                  <select
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                    value={article.authorType}
                    onChange={e => setArticle({ ...article, authorType: e.target.value as 'Person' | 'Organization' })}
                  >
                    <option value="Person">Person</option>
                    <option value="Organization">Organization</option>
                  </select>
                </div>
                <TextField label="Author Name" value={article.authorName} onChange={v => setArticle({ ...article, authorName: v })} />
                <TextField label="Author URL" value={article.authorUrl} onChange={v => setArticle({ ...article, authorUrl: v })} placeholder="https://example.com/author" />
                <TextField label="Publisher Name" value={article.publisherName} onChange={v => setArticle({ ...article, publisherName: v })} />
                <TextField label="Publisher Logo" value={article.publisherLogo} onChange={v => setArticle({ ...article, publisherLogo: v })} placeholder="https://example.com/logo.png" />
                <TextField label="Date Published" value={article.datePublished} onChange={v => setArticle({ ...article, datePublished: v })} placeholder="YYYY-MM-DD" />
                <TextField label="Date Modified" value={article.dateModified} onChange={v => setArticle({ ...article, dateModified: v })} placeholder="YYYY-MM-DD" />
              </div>
              
            </div>
          )}

          {schemaType === 'author' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <TextField label="Name" value={author.name} onChange={v => setAuthor({ ...author, name: v })} />
                <TextField label="URL" value={author.url} onChange={v => setAuthor({ ...author, url: v })} placeholder="https://example.com/author" />
                <TextField label="Image URL" value={author.image} onChange={v => setAuthor({ ...author, image: v })} placeholder="https://example.com/photo.jpg" />
                <TextField label="Job Title" value={author.jobTitle} onChange={v => setAuthor({ ...author, jobTitle: v })} />
                <TextField label="Works For" value={author.worksFor} onChange={v => setAuthor({ ...author, worksFor: v })} />
              </div>
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">Social Profiles</label>
                <SocialProfilesEditor values={author.sameAsList} onChange={(values) => setAuthor({ ...author, sameAsList: values })} />
              </div>
            </div>
          )}

          {schemaType === 'faq' && (
            <div className="space-y-4">
              {faq.map((item, idx) => (
                <div key={idx} className="border rounded-md p-3 space-y-3 bg-gray-50">
                  <div className="flex items-center justify-between">
                    <div className="text-sm font-medium text-gray-700">Question #{idx + 1}</div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        className="text-xs text-red-600 hover:underline"
                        onClick={() => setFaq(prev => prev.filter((_, i) => i !== idx))}
                        disabled={faq.length === 1}
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                  <TextField label="Question" value={item.question} onChange={v => setFaq(prev => prev.map((it, i) => i === idx ? { ...it, question: v } : it))} />
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Answer</label>
                    <textarea
                      className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm min-h-[96px]"
                      value={item.answer}
                      onChange={e => setFaq(prev => prev.map((it, i) => i === idx ? { ...it, answer: e.target.value } : it))}
                      placeholder="This is the answer to the question..."
                    />
                  </div>
                </div>
              ))}
              <button
                type="button"
                className="inline-flex items-center justify-center rounded-md border border-gray-300 px-3 py-2 text-sm hover:bg-gray-50"
                onClick={() => setFaq(prev => [...prev, { question: '', answer: '' }])}
              >
                Add Question
              </button>
            </div>
          )}
        </div>

        <div className="bg-gray-50 border rounded-lg p-4 overflow-auto">
          <div className="flex items-center justify-end gap-2 mb-2">
            <button
              type="button"
              onClick={copyJson}
              title="Copy JSON-LD"
              aria-label="Copy JSON-LD"
              className="inline-flex items-center justify-center rounded-md border border-gray-300 bg-white p-2 text-sm hover:bg-gray-100"
            >
              <CopyIcon className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={clearSchema}
              title="Clear"
              aria-label="Clear"
              className="inline-flex items-center justify-center rounded-md border border-gray-300 bg-white p-2 text-sm hover:bg-gray-100 text-red-600"
            >
              <TrashIcon className="w-4 h-4" />
            </button>
            <a
              href="https://search.google.com/test/rich-results"
              target="_blank"
              rel="noreferrer"
              title="Open Rich Results Test"
              aria-label="Open Rich Results Test"
              className="inline-flex items-center justify-center rounded-md border border-gray-300 bg-white p-2 text-sm hover:bg-gray-100"
            >
              <ExternalLinkIcon className="w-4 h-4" />
            </a>
          </div>
          <div className="text-xs lg:text-sm text-black font-mono whitespace-pre">
            {wrapScript ? `<script type="application/ld+json">\n${jsonLdString}\n</script>` : jsonLdString}
          </div>
        </div>
      </div>
    </div>
  );
}

function TextField({ label, value, onChange, placeholder, maxLength }: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  maxLength?: number;
}) {
  const lengthInfo = typeof maxLength === 'number' ? `${value.length}/${maxLength}` : undefined;
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <label className="block text-sm font-medium text-gray-700">{label}</label>
        {lengthInfo && (
          <span className="text-[11px] text-gray-500">{lengthInfo}</span>
        )}
      </div>
      <input
        type="text"
        value={value}
        onChange={e => onChange(maxLength ? e.target.value.slice(0, maxLength) : e.target.value)}
        placeholder={placeholder}
        className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
      />
    </div>
  );
}

export default SchemaGenerator;

function SocialProfilesEditor({ values, onChange }: { values: string[]; onChange: (values: string[]) => void; }) {
  const [input, setInput] = useState('');
  const add = () => {
    const v = input.trim();
    if (!v) return;
    onChange([...(values || []), v]);
    setInput('');
  };
  const remove = (idx: number) => onChange(values.filter((_, i) => i !== idx));
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <input
          type="text"
          className="flex-1 border border-gray-300 rounded-md px-3 py-2 text-sm"
          placeholder="https://twitter.com/..., https://linkedin.com/in/..."
          value={input}
          onChange={e => setInput(e.target.value)}
        />
        <button
          type="button"
          onClick={add}
          className="inline-flex items-center justify-center rounded-md border border-gray-300 px-3 py-2 text-sm hover:bg-gray-50"
        >
          Add
        </button>
      </div>
      {!!values?.length && (
        <div className="flex flex-wrap gap-2">
          {values.map((v, idx) => (
            <span key={idx} className="inline-flex items-center gap-2 text-xs bg-white border rounded px-2 py-1">
              {v}
              <button type="button" className="text-red-600" onClick={() => remove(idx)}>×</button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}


