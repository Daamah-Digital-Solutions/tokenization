Hi Claude,

I'm reviewing the responsive (mobile) view of the dashboard and have identified a small UI issue in the main header that needs to be fixed.

The Problem:

when viewing the platform on a mobile device, the current page title (e.g., "Overview") appears next to the hamburger menu icon. Because of the limited space, the text gets truncated with an ellipsis (e.g., "Overvie..."). This doesn't look clean and professional.

The Solution:

For mobile viewports, the page title text in the header is redundant because the user can already see the main content and title of the page below.

Please implement:



 Completely hide the page title text next to the menu icon on mobile screens. The header on mobile should only contain the hamburger icon on the left, the CapiMax logo (or name), and the user-related icons on the right.

The goal is to create a cleaner and less cluttered header for the mobile experience.

Please apply this fix to all pages within the dashboard.

Thanks,