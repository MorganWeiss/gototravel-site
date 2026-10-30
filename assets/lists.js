/* List pages: "Copy this list" (the app's shared-board text) and the waitlist form, tagged with the list. */
(function () {
  "use strict";
  var G = window.GTT;
  var text = document.querySelector("[data-list-text]");
  document.querySelectorAll("[data-copy-list]").forEach(function (btn) {
    btn.addEventListener("click", function () {
      var label = btn.textContent;
      G.copyText(text ? text.value : "").then(function (ok) {
        btn.textContent = ok ? "Copied" : "Couldn't copy";
        setTimeout(function () { btn.textContent = label; }, 1800);
        if (ok) G.track("list_copy", {});
      });
    });
  });
  document.querySelectorAll("form[data-list-waitlist]").forEach(function (form) {
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var msg = form.querySelector(".form-msg");
      var btn = form.querySelector("button[type=submit]");
      var input = form.elements.email;
      var email = input.value.trim().toLowerCase();
      msg.textContent = ""; msg.classList.remove("err");
      if (!G.EMAIL_RE.test(email)) {
        msg.textContent = "Check your email address."; msg.classList.add("err");
        input.setAttribute("aria-invalid", "true"); input.focus(); return;
      }
      input.removeAttribute("aria-invalid");
      var label = btn.textContent;
      btn.disabled = true; btn.textContent = "Saving…";
      G.saveEmail({ email: email, source: "other", utm_content: "list-" + form.dataset.slug, website: form.elements.website ? form.elements.website.value : "" })
        .then(function (data) {
          G.markSignedUp(data, "other");
          G.track("signup", { source: "list" });
          var done = document.createElement("p");
          done.className = "joined"; done.setAttribute("tabindex", "-1");
          done.textContent = data.confirm ? "Almost there: check your email to confirm." : "You're on the list. Your invite comes by email.";
          form.replaceWith(done); done.focus({ preventScroll: true });
        })
        .catch(function (err) {
          console.error("[list signup]", err);
          btn.disabled = false; btn.textContent = label;
          msg.textContent = "That didn't save. Check your connection and try again."; msg.classList.add("err");
        });
    });
  });
})();
