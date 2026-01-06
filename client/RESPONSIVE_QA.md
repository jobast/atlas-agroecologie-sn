# Responsive QA Checklist

Test at: 320px, 375px, 768px, 1024px, desktop.

## Global
- No horizontal scroll (except tables).
- Navbar: hamburger on mobile, links accessible, closes after navigation.
- Footer does not cover content (routes still usable above it).
- Buttons and inputs are reachable and tappable.

## `/map`
- Mobile: map is first and usable immediately.
- Mobile: "Explorer" opens drawer; tabs switch between Liste / Filtres / Stats.
- Drawer: selecting an initiative recenters the map and closes the drawer.
- Desktop: left panel visible; overview panel does not cover controls unintentionally.

## `/table`
- Mobile: only key columns show; horizontal scroll works if needed.
- Sorting still works on visible headers.

## Auth + Forms (`/login`, `/register`, `/submit`)
- Inputs fit the screen; no clipped buttons.
- Coordinate inputs stack on mobile; map picker fits without overflow.

## Admin (`/admin`, `/users`, `/form-fields`)
- Tables are scrollable on small screens.
- Modals and dialogs fit within viewport and are closable.
