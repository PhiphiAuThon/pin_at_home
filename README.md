# Pin@Home

Pinterest overlay for displaying random pins from a board.
I personally set a Pinterest board as new tab page on my browser to get random inspiration.


## 🚀 Setup

1.  **Open Extensions Page**
    *   Go to `brave://extensions/` (or `chrome://extensions/`)

2.  **Load the New Extension**
    *   If you have the old "Pin@Home" extension loaded, **remove it** or disable it.
    *   Click **"Load unpacked"**.
    *   Select the **`zen_mode_v2`** folder inside your project directory (`Documents/dev/pint_at_home/zen_mode_v2`).

## 🧪 How to Test

1.  **Go to Pinterest**
    *   Navigate to any Pinterest board URL (e.g., `https://www.pinterest.com/your-username/your-board/`).
    *   *Note: It works on the home feed too!*

2.  **Watch the Magic**
    *   As soon as the page loads, the screen should turn dark.
    *   A "Finding Inspiration..." message might appear briefly.
    *   **BAM!** A clean grid of pins should fade in.

3.  **Controls**
    *   **Shuffle**: Click to pick a new set of random pins from the page.
    *   **Exit**: Click to close the overlay and see the normal Pinterest page.

## 🐛 Troubleshooting

*   **"I see the dark screen but no pins!"**
    *   Wait a few seconds. The script is scanning for images.
    *   If nothing happens, try scrolling down a bit (the overlay blocks scrolling, so you might need to Exit, scroll down to load more pins, then refresh).
    *   *Fix coming:* The "Shuffle" button tries to scroll automatically for you.

*   **"It doesn't load on my country's Pinterest (e.g., .fr, .de)"**
    *   I added support for `.com`, `.fr`, `.de`, `.co.uk`, `.ca`, `.jp`. If you use another domain, let me know!
