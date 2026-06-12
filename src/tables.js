var rules = {}

// Helper function to safely get text content and clean it
function cleanCellContent(content) {
  if (!content) return '   ' // Default empty cell content
  
  // Clean and normalize content
  let cleaned = content
    .trim()
    .replace(/\s+/g, ' ') // Normalize whitespace
    .replace(/\|/g, '\\|') // Escape pipes
    .replace(/\\/g, '\\\\') // Escape backslashes
    .replace(/\n+/g, ' ') // Convert newlines to spaces
    .replace(/\r+/g, ' ') // Convert carriage returns to spaces
  
  // If content is still empty or only whitespace, provide default
  if (!cleaned || cleaned.match(/^\s*$/)) {
    return '   '
  }
  
  // Ensure minimum width for table readability
  if (cleaned.length < 3) {
    cleaned += ' '.repeat(3 - cleaned.length)
  }
  
  return cleaned
}

// Enhanced cell replacement with colspan support
function cell(content, node, index) {
  if (index === null && node && node.parentNode) {
    index = Array.prototype.indexOf.call(node.parentNode.childNodes, node)
  }
  if (index === null) index = 0
  
  var prefix = ' '
  if (index === 0) prefix = '| '
  
  let cellContent = cleanCellContent(content)
  
  // Handle colspan by adding extra empty cells
  let colspan = 1
  if (node && node.getAttribute) {
    colspan = parseInt(node.getAttribute('colspan') || '1', 10)
    if (isNaN(colspan) || colspan < 1) colspan = 1
  }
  
  let result = prefix + cellContent + ' |'
  
  // Add empty cells for colspan
  for (let i = 1; i < colspan; i++) {
    result += '   |'
  }
  
  return result
}

// Check if a line is a valid GFM table separator row
function isSeparatorRow(line) {
  // Trim and require it to start and end with a pipe
  const s = (line || '').trim()
  if (!s.startsWith('|') || !s.endsWith('|')) return false

  // Each cell must be only dashes, optionally wrapped with colons, with optional spaces
  // e.g., '---', ':---', '---:', ':---:' (minimum 3 dashes per GFM)
  const cells = s.split('|').slice(1, -1) // inner cells
  if (cells.length === 0) return false

  return cells.every(c => /^ *:?-{3,}:? *$/.test(c))
}

// Check if this is a heading row (enhanced for edge cases)
function isHeadingRow(tr) {
  if (!tr || !tr.parentNode) return false
  
  var parentNode = tr.parentNode
  
  // Check if parent is THEAD
  if (parentNode.nodeName === 'THEAD') return true
  
  // Check if it's the first row and contains TH elements
  if (parentNode.firstChild === tr && 
      (parentNode.nodeName === 'TABLE' || parentNode.nodeName === 'TBODY')) {
    
    // Check if all child nodes are TH (ignore text nodes)
    var cellNodes = Array.prototype.filter.call(tr.childNodes, function(n) {
      return n.nodeType === 1 // Element nodes only
    })
    
    if (cellNodes.length === 0) return false
    
    return Array.prototype.every.call(cellNodes, function (n) { 
      return n.nodeName === 'TH' 
    })
  }
  
  return false
}

// Get table column count (handles edge cases)
function getTableColCount(table) {
  if (!table || !table.rows) return 0
  
  let maxCols = 0
  for (let i = 0; i < table.rows.length; i++) {
    const row = table.rows[i]
    if (!row || !row.childNodes) continue
    
    let colCount = 0
    for (let j = 0; j < row.childNodes.length; j++) {
      const cell = row.childNodes[j]
      if (cell.nodeType === 1 && (cell.nodeName === 'TD' || cell.nodeName === 'TH')) {
        const colspan = parseInt(cell.getAttribute('colspan') || '1', 10)
        colCount += isNaN(colspan) ? 1 : Math.max(1, colspan)
      }
    }
    
    if (colCount > maxCols) maxCols = colCount
  }
  
  return maxCols
}

// Check if table should be skipped (too simple or malformed)
function shouldSkipTable(table) {
  if (!table) return true
  
  // Skip completely empty tables
  if (!table.rows || table.rows.length === 0) return true
  
  // Count actual content cells
  let contentCells = 0
  let totalCells = 0
  
  for (let i = 0; i < table.rows.length; i++) {
    const row = table.rows[i]
    if (!row || !row.childNodes) continue
    
    for (let j = 0; j < row.childNodes.length; j++) {
      const cell = row.childNodes[j]
      if (cell.nodeType === 1 && (cell.nodeName === 'TD' || cell.nodeName === 'TH')) {
        totalCells++
        if (cell.textContent && cell.textContent.trim()) {
          contentCells++
        }
      }
    }
  }
  
  // Skip if no cells or only one cell with no meaningful content
  if (totalCells === 0) return true
  if (totalCells === 1 && contentCells === 0) return true
  
  return false
}

rules.tableCell = {
  filter: ['th', 'td'],
  replacement: function (content, node) {
    return cell(content, node, null)
  }
}

rules.tableRow = {
  filter: 'tr',
  replacement: function (content, node) {
    // Skip empty rows
    if (!content || !content.trim()) return ''
    
    var borderCells = ''
    
    // Add separator row for heading
    if (isHeadingRow(node)) {
      const table = node.closest('table')
      if (table) {
        const colCount = getTableColCount(table)
        
        if (colCount > 0) {
          for (var i = 0; i < colCount; i++) {
            const prefix = i === 0 ? '| ' : ' '
            borderCells += prefix + '---' + ' |'
          }
        }
      }
    }
    
    return '\n' + content + (borderCells ? '\n' + borderCells : '')
  }
}

rules.table = {
  filter: 'table',
  replacement: function (content, node) {
    // Check if table should be skipped
    if (shouldSkipTable(node)) {
      return ''
    }
    
    // Clean up content (remove extra newlines)
    content = content.replace(/\n+/g, '\n').trim()
    
    // If no content after cleaning, return empty
    if (!content) return ''
    
    // Split into lines and filter out empty lines
    const lines = content.split('\n').filter(line => line.trim())
    
    if (lines.length === 0) return ''
    
    // Check if we need to add a header row
    const hasHeaderSeparator = lines.length >= 2 && isSeparatorRow(lines[1])
    
    let result = lines.join('\n')
    
    // If no header separator exists, add a simple one
    if (!hasHeaderSeparator && lines.length >= 1) {
      const firstLine = lines[0]
      const colCount = (firstLine.match(/\|/g) || []).length - 1
      
      if (colCount > 0) {
        let separator = '|'
        for (let i = 0; i < colCount; i++) {
          separator += ' --- |'
        }
        
        // Insert separator after first line
        const resultLines = [lines[0], separator, ...lines.slice(1)]
        result = resultLines.join('\n')
      }
    }
    
    return '\n\n' + result + '\n\n'
  }
}

// Remove table sections but keep content
rules.tableSection = {
  filter: ['thead', 'tbody', 'tfoot'],
  replacement: function (content) {
    return content
  }
}

// Remove captions and colgroups
rules.tableCaption = {
  filter: ['caption'],
  replacement: function() { return '' }
}

rules.tableColgroup = {
  filter: ['colgroup', 'col'],
  replacement: function() { return '' }
}

export default function tables(turndownService) {
  for (var key in rules) {
    turndownService.addRule(key, rules[key])
  }
}
