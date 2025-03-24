import * as pdfjsLib from 'pdfjs-dist';

pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

let currentText = '';
let pdfDocument = null;
let textToPageMap = new Map();

// Evento para abrir el selector de archivos PDF
document.getElementById('open-pdf').addEventListener('click', () => {
  document.getElementById('file-input').click();
});

// Evento para mostrar/ocultar el campo de búsqueda de texto
document.getElementById('search-text').addEventListener('click', () => {
  const searchInput = document.getElementById('search-input');
  searchInput.style.display =
    searchInput.style.display === 'none' ? 'block' : 'none';
  if (searchInput.style.display === 'block') {
    searchInput.focus();
  }
});

// Evento para buscar texto dentro del área de texto extraído
document.getElementById('search-input').addEventListener('input', (e) => {
  const searchTerm = e.target.value.toLowerCase();
  const textArea = document.getElementById('extracted-text');
  const text = textArea.value;

  if (!searchTerm) {
    textArea.value = currentText;
    return;
  }

  const regex = new RegExp(searchTerm, 'gi');
  const highlightedText = text.replace(regex, (match) => `[${match}]`);
  textArea.value = highlightedText;
});

// Evento para anonimizar el texto extraído usando un servidor externo
document
  .getElementById('anonymize-text')
  .addEventListener('click', async () => {
    const textArea = document.getElementById('extracted-text');
    const text = textArea.value;

    try {
      const response = await fetch('http://localhost:3000/anonymize', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ text }),
      });

      if (!response.ok) {
        throw new Error('Failed to anonymize text');
      }

      const { anonymizedText } = await response.json();
      textArea.value = anonymizedText;
      currentText = anonymizedText;

      Swal.fire({
        title: 'Texto Anonimizado',
        text: 'El texto ha sido anonimizado exitosamente',
        icon: 'success',
        timer: 2000,
        showConfirmButton: false,
      });
    } catch (error) {
      Swal.fire({
        title: 'Error',
        text: 'No se pudo anonimizar el texto',
        icon: 'error',
      });
    }
  });

// Evento para guardar el texto extraído en un archivo de texto
document.getElementById('save-text').addEventListener('click', () => {
  const text = document.getElementById('extracted-text').value;
  const blob = new Blob([text], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'texto_anonimizado.txt';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
});

// Manejo de selección de texto en el área de texto
document
  .getElementById('extracted-text')
  .addEventListener('select', (event) => {
    const textarea = event.target;
    const selectedText = textarea.value.substring(
      textarea.selectionStart,
      textarea.selectionEnd
    );

    if (selectedText && textToPageMap.has(selectedText)) {
      const pageNum = textToPageMap.get(selectedText);
      navigateToPdfPage(pageNum);
      highlightTextInPdf(selectedText, pageNum);
    }
  });

// Función para navegar a una página específica del PDF
async function navigateToPdfPage(pageNum) {
  if (!pdfDocument) return;

  const page = await pdfDocument.getPage(pageNum);
  const viewport = page.getViewport({ scale: 1.0 });

  const iframe = document.getElementById('pdf-iframe');
  iframe.contentWindow.scrollTo(0, viewport.height * (pageNum - 1));
}

// Función para resaltar texto dentro del visor PDF
async function highlightTextInPdf(text, pageNum) {
  console.log(`Highlighting "${text}" on page ${pageNum}`);
}

// Evento para manejar la carga del archivo PDF
document
  .getElementById('file-input')
  .addEventListener('change', async (event) => {
    const file = event.target.files[0];
    if (file && file.type === 'application/pdf') {
      const fileReader = new FileReader();
      fileReader.onload = async function () {
        const pdfData = new Uint8Array(this.result);
        const pdfUrl = URL.createObjectURL(
          new Blob([pdfData], { type: 'application/pdf' })
        );
        document.getElementById('pdf-iframe').src = pdfUrl;

        try {
          Swal.fire({
            title: 'Extrayendo texto del PDF...',
            text: 'Por favor, espera.',
            icon: 'info',
            allowOutsideClick: false,
            didOpen: () => {
              Swal.showLoading();
            },
          });

          pdfDocument = await pdfjsLib.getDocument({ data: pdfData }).promise;
          let text = '';
          textToPageMap.clear();

          for (let i = 1; i <= pdfDocument.numPages; i++) {
            const page = await pdfDocument.getPage(i);
            const textContent = await page.getTextContent();
            textContent.items.forEach((item) => {
              const itemText = item.str + ' ';
              text += itemText;
              textToPageMap.set(itemText.trim(), i);
            });
          }

          currentText = text;
          document.getElementById('extracted-text').value = text;
          Swal.close();
        } catch (error) {
          Swal.fire({
            title: 'Error',
            text: `No se puede extraer el texto del PDF: ${error.message}`,
            icon: 'error',
          });
          console.error('Error extrayendo texto del PDF:', error);
        }
      };
      fileReader.readAsArrayBuffer(file);
    } else {
      Swal.fire({
        title: 'Error',
        text: 'Por favor, selecciona un archivo PDF válido.',
        icon: 'error',
      });
    }
  });
