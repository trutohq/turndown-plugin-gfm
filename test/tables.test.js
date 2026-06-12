import { readFileSync } from 'fs'
import { join } from 'path'
import TurndownService from 'turndown'
import { beforeEach, describe, expect, it } from 'vitest'
import { tables } from '../src/index.js'

describe('Tables Plugin', () => {
  let turndownService

  beforeEach(() => {
    turndownService = new TurndownService({
      headingStyle: 'atx',
      codeBlockStyle: 'fenced'
    })
    turndownService.use(tables)
  })

  describe('Basic table functionality', () => {
    it('should convert simple tables', () => {
      const html = `
        <table>
          <tr><th>Name</th><th>Age</th></tr>
          <tr><td>John</td><td>30</td></tr>
          <tr><td>Jane</td><td>25</td></tr>
        </table>
      `
      
      const result = turndownService.turndown(html)
      
      expect(result).toMatch(/\|\s*Name\s*\|\s*Age\s*\|/)
      expect(result).toMatch(/\|\s*---\s*\|\s*---\s*\|/)
      expect(result).toMatch(/\|\s*John\s*\|\s*30\s*\|/)
      expect(result).toMatch(/\|\s*Jane\s*\|\s*25\s*\|/)
    })

    it('should handle tables without headers', () => {
      const html = `
        <table>
          <tr><td>Row 1 Col 1</td><td>Row 1 Col 2</td></tr>
          <tr><td>Row 2 Col 1</td><td>Row 2 Col 2</td></tr>
        </table>
      `
      
      const result = turndownService.turndown(html)
      
      expect(result).toMatch(/\|\s*Row 1 Col 1\s*\|\s*Row 1 Col 2\s*\|/)
      expect(result).toMatch(/\|\s*---\s*\|\s*---\s*\|/)
      expect(result).toMatch(/\|\s*Row 2 Col 1\s*\|\s*Row 2 Col 2\s*\|/)
    })

    it('should convert tables to markdown format only', () => {
      const html = '<table><tr><th>A</th></tr><tr><td>1</td></tr></table>'
      const result = turndownService.turndown(html)
      
      expect(result).not.toContain('<table')
      expect(result).not.toContain('</table>')
      expect(result).toMatch(/\|.*\|/)
    })
  })

  describe('Edge cases', () => {
    it('should handle empty tables gracefully', () => {
      const html = '<table></table>'
      const result = turndownService.turndown(html)
      
      expect(result.trim()).toBe('')
    })

    it('should handle single cell tables', () => {
      const html = '<table><tr><td>Single Cell</td></tr></table>'
      const result = turndownService.turndown(html)
      
      expect(result).toMatch(/\|\s*Single Cell\s*\|/)
      expect(result).toMatch(/\|\s*---\s*\|/)
    })

    it('should escape pipe characters in content', () => {
      const html = '<table><tr><th>Column</th></tr><tr><td>A | B | C</td></tr></table>'
      const result = turndownService.turndown(html)
      
      expect(result).toContain('A \\\\| B \\\\| C')
    })

    it('should handle line breaks in cells', () => {
      const html = `
        <table>
          <tr><th>Name</th></tr>
          <tr><td>John<br>Doe</td></tr>
        </table>
      `
      
      const result = turndownService.turndown(html)
      
      expect(result).toMatch(/\|\s*John Doe\s*\|/)
    })

    it('should handle empty cells', () => {
      const html = `
        <table>
          <tr><th>Name</th><th>Value</th></tr>
          <tr><td>Item 1</td><td></td></tr>
          <tr><td></td><td>123</td></tr>
        </table>
      `
      
      const result = turndownService.turndown(html)
      
      expect(result).toMatch(/\|\s*Item 1\s*\|\s*\|\s*/)
      expect(result).toMatch(/\|\s*\|\s*123\s*\|/)
    })

    it('should handle colspan', () => {
      const html = `
        <table>
          <tr><th>Name</th><th colspan="2">Contact</th></tr>
          <tr><td>John</td><td>Email</td><td>Phone</td></tr>
        </table>
      `
      
      const result = turndownService.turndown(html)
      
      expect(result).toMatch(/\|\s*Contact\s*\|\s{3}\|/)
    })

    it('should handle malformed HTML gracefully', () => {
      const html = `
        <table>
          <tr>
            <td>Cell 1
            <td>Cell 2</td>
          </tr>
        </table>
      `
      
      const result = turndownService.turndown(html)
      
      expect(result).toMatch(/\|\s*Cell 1\s*\|\s*Cell 2\s*\|/)
    })

    it('should handle nested content', () => {
      const html = `
        <table>
          <tr><th>Content</th></tr>
          <tr><td><strong>Bold</strong> and <em>italic</em></td></tr>
        </table>
      `
      
      const result = turndownService.turndown(html)
      
      expect(result).toMatch(/\|\s*\*\*Bold\*\* and _italic_\s*\|/)
    })

    it('should handle very wide tables', () => {
      const html = `
        <table>
          <tr>
            <th>C1</th><th>C2</th><th>C3</th><th>C4</th><th>C5</th>
            <th>C6</th><th>C7</th><th>C8</th><th>C9</th><th>C10</th>
          </tr>
          <tr>
            <td>1</td><td>2</td><td>3</td><td>4</td><td>5</td>
            <td>6</td><td>7</td><td>8</td><td>9</td><td>10</td>
          </tr>
        </table>
      `
      
      const result = turndownService.turndown(html)
      
      // Should have 10 columns
      const headerRow = result.split('\n').find(line => line.includes('C1'))
      expect((headerRow.match(/\|/g) || []).length).toBe(11) // 11 pipes for 10 columns
    })
  })

  describe('Comprehensive HTML file tests', () => {
    it('should handle empty tables from HTML file', () => {
      const htmlPath = join(process.cwd(), 'test', 'empty-table.html')
      const html = readFileSync(htmlPath, 'utf8')
      
      const result = turndownService.turndown(html)
      
      // Should handle empty tables gracefully - they get skipped
      expect(result).not.toContain('<table')
      // The result should contain the heading but no tables
      expect(result).toContain('Empty Table Test')
    })

    it('should handle single cell tables from HTML file', () => {
      const htmlPath = join(process.cwd(), 'test', 'single-cell-table.html')
      const html = readFileSync(htmlPath, 'utf8')
      
      const result = turndownService.turndown(html)
      
      expect(result).toContain('Single Cell Table Test')
      expect(result).toMatch(/\|\s*Single Cell\s*\|/)
      expect(result).toMatch(/\|\s*Header Only\s*\|/)
      expect(result).not.toContain('<table')
    })

    it('should handle tables without headers from HTML file', () => {
      const htmlPath = join(process.cwd(), 'test', 'no-headers-table.html')
      const html = readFileSync(htmlPath, 'utf8')
      
      const result = turndownService.turndown(html)
      
      expect(result).toContain('Table Without Headers Test')
      expect(result).toMatch(/\|\s*Row 1 Col 1\s*\|\s*Row 1 Col 2\s*\|\s*Row 1 Col 3\s*\|/)
      expect(result).toMatch(/\|\s*---\s*\|\s*---\s*\|\s*---\s*\|/)
      expect(result).not.toContain('<table')
    })

    it('should handle colspan and rowspan from HTML file', () => {
      const htmlPath = join(process.cwd(), 'test', 'colspan-rowspan-table.html')
      const html = readFileSync(htmlPath, 'utf8')
      
      const result = turndownService.turndown(html)
      
      expect(result).toContain('Colspan and Rowspan Table Test')
      expect(result).toMatch(/\|\s*Contact Info\s*\|\s{3}\|/) // Colspan creates extra cells
      expect(result).not.toContain('<table')
    })

    it('should handle nested content from HTML file', () => {
      const htmlPath = join(process.cwd(), 'test', 'nested-content-table.html')
      const html = readFileSync(htmlPath, 'utf8')
      
      const result = turndownService.turndown(html)
      
      expect(result).toContain('Table with Nested Content Test')
      expect(result).toMatch(/\*\*Lists\*\*/) // Bold text
      expect(result).toContain('* Item 1') // List items converted (with space)
      expect(result).not.toContain('<table')
    })

    it('should handle line breaks from HTML file', () => {
      const htmlPath = join(process.cwd(), 'test', 'line-breaks-table.html')
      const html = readFileSync(htmlPath, 'utf8')
      
      const result = turndownService.turndown(html)
      
      expect(result).toContain('Table with Line Breaks Test')
      expect(result).toMatch(/\|\s*John Doe\s*\|/) // Line breaks converted to spaces
      expect(result).toMatch(/\|\s*Jane Smith\s*\|/)
      expect(result).not.toContain('<br')
      expect(result).not.toContain('<table')
    })

    it('should handle tables with lists inside cells from HTML file', () => {
      const htmlPath = join(process.cwd(), 'test', 'list-in-cell-table.html')
      const html = readFileSync(htmlPath, 'utf8')

      // Force dash bullets to reproduce the original bug
      turndownService.options.bulletListMarker = '-'

      const result = turndownService.turndown(html)

      expect(result).toContain('Table with List in Cell Test')
      expect(result).toMatch(/^\|\s*---\s*\|\s*---\s*\|$/m)
      expect(result).toMatch(/\|\s*- Item one - Item two\s*\|/)
      expect(result).not.toContain('<table')
    })

    it('should handle special characters from HTML file', () => {
      const htmlPath = join(process.cwd(), 'test', 'special-characters-table.html')
      const html = readFileSync(htmlPath, 'utf8')
      
      const result = turndownService.turndown(html)
      
      expect(result).toContain('Table with Special Characters Test')
      expect(result).toContain('A \\\\| B \\\\| C') // Pipes escaped
      expect(result).toContain('C:\\\\\\\\Users') // Backslashes escaped
      expect(result).not.toContain('<table')
    })

    it('should handle malformed HTML from HTML file', () => {
      const htmlPath = join(process.cwd(), 'test', 'malformed-table.html')
      const html = readFileSync(htmlPath, 'utf8')
      
      const result = turndownService.turndown(html)
      
      expect(result).toContain('Malformed Table Test')
      expect(result).toMatch(/\|\s*Cell 1\s*\|\s*Cell 2\s*\|/) // Handles missing closing tags
      expect(result).toMatch(/\|\s*Cell 3\s*\|\s*Cell 4\s*\|/)
      expect(result).not.toContain('<table')
    })

    it('should handle empty cells from HTML file', () => {
      const htmlPath = join(process.cwd(), 'test', 'empty-cells-table.html')
      const html = readFileSync(htmlPath, 'utf8')
      
      const result = turndownService.turndown(html)
      
      expect(result).toContain('Table with Empty Cells Test')
      expect(result).toMatch(/\|\s*Item 1\s*\|\s*\|\s*Empty value\s*\|/) // Empty cells handled
      expect(result).toMatch(/\|\s*\|\s*123\s*\|\s*Empty name\s*\|/)
      expect(result).not.toContain('<table')
    })

    it('should handle wide tables from HTML file', () => {
      const htmlPath = join(process.cwd(), 'test', 'wide-table.html')
      const html = readFileSync(htmlPath, 'utf8')
      
      const result = turndownService.turndown(html)
      
      expect(result).toContain('Very Wide Table Test')
      // Should have 15 columns
      const headerRow = result.split('\n').find(line => line.includes('Col1'))
      expect((headerRow.match(/\|/g) || []).length).toBe(16) // 16 pipes for 15 columns
      expect(result).not.toContain('<table')
    })

    it('should handle minimal tables from HTML file', () => {
      const htmlPath = join(process.cwd(), 'test', 'minimal-table.html')
      const html = readFileSync(htmlPath, 'utf8')
      
      const result = turndownService.turndown(html)
      
      expect(result).toContain('Minimal Valid Table Test')
      expect(result).toMatch(/\|\s*Name\s*\|\s*Age\s*\|/)
      expect(result).toMatch(/\|\s*John\s*\|\s*30\s*\|/)
      expect(result).toMatch(/\|\s*A\s*\|\s*B\s*\|/)
      expect(result).toMatch(/\|\s*1\s*\|\s*2\s*\|/)
      expect(result).not.toContain('<table')
    })
  })

  describe('Performance tests', () => {
    it('should handle large tables efficiently', () => {
      // Test with the original long table
      const htmlPath = join(process.cwd(), 'test', 'long-table.html')
      const html = readFileSync(htmlPath, 'utf8')
      
      const startTime = Date.now()
      const result = turndownService.turndown(html)
      const duration = Date.now() - startTime
      
      // Should be much faster than the original >13 seconds
      expect(duration).toBeLessThan(5000) // 5 seconds max
      
      // Should produce markdown table
      expect(result).toMatch(/\|.*\|/)
      expect(result).toMatch(/\|\s*---/)
      expect(result).not.toContain('<table')
    })

    it('should maintain consistent performance across multiple conversions', () => {
      const html = `
        <table>
          ${Array.from({ length: 100 }, (_, i) => `
            <tr>
              <td>Row ${i + 1} Col 1</td>
              <td>Row ${i + 1} Col 2</td>
              <td>Row ${i + 1} Col 3</td>
            </tr>
          `).join('')}
        </table>
      `
      
      const times = []
      for (let i = 0; i < 5; i++) {
        const start = Date.now()
        turndownService.turndown(html)
        times.push(Date.now() - start)
      }
      
      // All conversions should be fast
      times.forEach(time => {
        expect(time).toBeLessThan(1000) // 1 second max
      })
      
      // Performance should be consistent (no memory leaks or degradation)
      const avgTime = times.reduce((a, b) => a + b) / times.length
      const maxDeviation = Math.max(...times) - Math.min(...times)
      expect(maxDeviation).toBeLessThan(avgTime * 2) // No more than 2x deviation
    })
  })
}) 