/**
 * Parses Google Docs API response into a usable structure.
 * Handles tabs (including nested), falling back to single-body docs.
 */

function parseDocContent(docData) {
  const title = docData.title || 'Untitled';
  const tabs = docData.tabs || [];

  if (tabs.length > 0) {
    // Flatten nested tabs into a single list
    const flatTabs = flattenTabs(tabs);
    return {
      title,
      tabs: flatTabs.map(tab => ({
        id:      tab.tabProperties?.tabId || tab.tabProperties?.title || 'tab',
        title:   tab.tabProperties?.title || 'Untitled Tab',
        content: parseBody(tab.documentTab?.body),
      })),
    };
  }

  // Fallback: legacy single-body doc
  return {
    title,
    tabs: [{
      id:      'main',
      title:   title,
      content: parseBody(docData.body),
    }],
  };
}

// Recursively flatten nested tab children into a flat array
function flattenTabs(tabs) {
  const result = [];
  for (const tab of tabs) {
    result.push(tab);
    if (tab.childTabs && tab.childTabs.length > 0) {
      result.push(...flattenTabs(tab.childTabs));
    }
  }
  return result;
}

function parseBody(body) {
  if (!body || !body.content) return [];
  const blocks = [];

  for (const element of body.content) {
    if (!element.paragraph) continue;
    const para  = element.paragraph;
    const style = para.paragraphStyle?.namedStyleType || 'NORMAL_TEXT';
    const text  = (para.elements || []).map(e => e.textRun?.content || '').join('');

    if (!text.trim()) {
      blocks.push({ type: 'spacer' });
      continue;
    }

    if (style.startsWith('HEADING_')) {
      const level = parseInt(style.replace('HEADING_', '')) || 1;
      blocks.push({ type: 'heading', level, text: text.replace(/\n$/, '') });
    } else {
      const runs = (para.elements || [])
        .filter(e => e.textRun)
        .map(e => ({
          text:      e.textRun.content || '',
          bold:      e.textRun.textStyle?.bold      || false,
          italic:    e.textRun.textStyle?.italic    || false,
          underline: e.textRun.textStyle?.underline || false,
        }))
        .filter(r => r.text && r.text !== '\n');

      if (runs.length > 0) blocks.push({ type: 'paragraph', runs });
    }
  }

  return blocks;
}

module.exports = { parseDocContent };
