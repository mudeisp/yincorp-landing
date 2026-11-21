// Share attribution storage and session IDs with the canonical property pages.
import('/portal-assets/portal-session.js').catch(() => {
  console.warn('ARCHITECTURE_ATTRIBUTION_UNAVAILABLE');
});

const office = document.body.dataset.architectureOffice;
const page = location.origin + location.pathname;
const send = (name, data) => window.gtag?.('event', name, {
  send_to: 'G-2ZDJCLSSDN',
  page_location: page,
  ...data
});

send(office ? 'architecture_office_view' : 'architecture_hub_view', office ? {office} : {});
document.addEventListener('click', trackClick);
document.addEventListener('auxclick', trackClick);

function trackClick(event) {
  if (event.button > 1 || event.defaultPrevented) return;
  const link = event.target.closest?.('a[data-project], a[data-architecture-contact]');
  if (!link) return;
  const destination = new URL(link.href);
  const destinationUrl = destination.origin + destination.pathname;
  if (link.hasAttribute('data-architecture-contact')) {
    send('architecture_contact_click', {...(office ? {office} : {}), destination_url: destinationUrl});
    return;
  }
  send('architecture_project_click', {
    office: link.dataset.office,
    project: link.dataset.project,
    destination_url: destinationUrl
  });
}
