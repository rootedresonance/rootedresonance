const CSS_FIX = '\n<style id="rr-tina-layout-fix">\n' +
  '  .flex.items-stretch.h-dvh.overflow-hidden > .w-full.relative {\n' +
  '    width: auto !important;\n' +
  '    flex: 1 1 0% !important;\n' +
  '    min-width: 0 !important;\n' +
  '  }\n' +
  '  .flex.items-stretch.h-dvh.overflow-hidden > .w-full.relative * {\n' +
  '    overflow-wrap: anywhere !important;\n' +
  '  }\n' +
  '</style>\n';

class HeadInjector {
  element(element) {
    element.append(CSS_FIX, { html: true });
  }
}

export async function onRequest(context) {
  const response = await context.next();
  const contentType = response.headers.get('content-type') || '';
  if (contentType.indexOf('text/html') === -1) {
    return response;
  }
  return new HTMLRewriter().on('head', new HeadInjector()).transform(response);
}
