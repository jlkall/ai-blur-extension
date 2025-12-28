/**
 * Export functionality for detection history
 * Supports CSV and JSON export
 */

(function() {
  'use strict';

  /**
   * Export history as CSV
   */
  function exportAsCSV(history, filename = 'closeai-detections.csv') {
    if (!history || history.length === 0) {
      return;
    }

    // CSV headers
    const headers = ['Timestamp', 'Type', 'Score', 'Confidence', 'Certainty', 'Domain', 'URL', 'Content Preview'];
    const rows = [headers.join(',')];

    // Add data rows
    history.forEach(detection => {
      const row = [
        `"${detection.timestamp}"`,
        `"${detection.type}"`,
        detection.score,
        detection.confidence !== null ? detection.confidence : '',
        detection.certainty,
        `"${detection.domain}"`,
        `"${detection.url}"`,
        `"${(detection.content || '').replace(/"/g, '""')}"` // Escape quotes in CSV
      ];
      rows.push(row.join(','));
    });

    // Create blob and download
    const csv = rows.join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    downloadBlob(blob, filename);
  }

  /**
   * Export history as JSON
   */
  function exportAsJSON(history, filename = 'closeai-detections.json') {
    if (!history || history.length === 0) {
      return;
    }

    const json = JSON.stringify(history, null, 2);
    const blob = new Blob([json], { type: 'application/json;charset=utf-8;' });
    downloadBlob(blob, filename);
  }

  /**
   * Download blob as file
   */
  function downloadBlob(blob, filename) {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  /**
   * Get statistics from history
   */
  function getStatistics(history) {
    if (!history || history.length === 0) {
      return {
        total: 0,
        text: 0,
        images: 0,
        avgScore: 0,
        avgCertainty: 0,
        domains: {},
        byDate: {}
      };
    }

    const stats = {
      total: history.length,
      text: 0,
      images: 0,
      avgScore: 0,
      avgCertainty: 0,
      domains: {},
      byDate: {}
    };

    let totalScore = 0;
    let totalCertainty = 0;

    history.forEach(detection => {
      // Count by type
      if (detection.type === 'text') {
        stats.text++;
      } else if (detection.type === 'image') {
        stats.images++;
      }

      // Sum scores
      totalScore += detection.score || 0;
      totalCertainty += detection.certainty || 0;

      // Count by domain
      const domain = detection.domain || 'unknown';
      stats.domains[domain] = (stats.domains[domain] || 0) + 1;

      // Count by date
      const date = detection.timestamp ? detection.timestamp.split('T')[0] : 'unknown';
      stats.byDate[date] = (stats.byDate[date] || 0) + 1;
    });

    stats.avgScore = stats.total > 0 ? totalScore / stats.total : 0;
    stats.avgCertainty = stats.total > 0 ? totalCertainty / stats.total : 0;

    return stats;
  }

  // Export functions to global scope
  if (typeof window !== 'undefined') {
    window.closeaiExport = {
      exportAsCSV: exportAsCSV,
      exportAsJSON: exportAsJSON,
      getStatistics: getStatistics
    };
  }
})();



