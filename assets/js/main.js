/* Gessner & Sohn — Demo-Site JS (client-side only, no data leaves the browser) */
(function () {
  "use strict";
  var PHONE = "0561 / 21060";
  var $ = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };

  function nowTime() {
    var d = new Date();
    return ("0" + d.getHours()).slice(-2) + ":" + ("0" + d.getMinutes()).slice(-2);
  }
  function el(tag, cls, html) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (html != null) n.innerHTML = html;
    return n;
  }
  function scrollChat(chat) { chat.scrollTop = chat.scrollHeight; }

  /* ---------------- Bot engine ---------------- */
  var TOPICS = [
    { id: "heizung-defekt", label: "Heizung defekt", emergency: true },
    { id: "wartung", label: "Wartung / Kundendienst" },
    { id: "neue-heizung", label: "Neue Heizung" },
    { id: "waermepumpe", label: "Wärmepumpe" },
    { id: "neues-bad", label: "Neues Bad" }
  ];
  var ROUTER_TOPICS = [
    { id: "waermepumpe", label: "Wärmepumpe / Heizung" },
    { id: "bad", label: "Badsanierung" },
    { id: "wartung", label: "Wartung / Service" },
    { id: "notfall", label: "Rohrbruch / Notfall", emergency: true }
  ];
  var CALLBACKS = ["Heute noch", "Morgen 8–10 Uhr", "Morgen Nachmittag"];

  function Bot(root) {
    this.root = root;
    this.mode = root.getAttribute("data-bot-mode") || "hero";
    this.chat = $(".chat", root);
    this.chips = $(".chips", root);
    this.input = $("input[type=text]", root);
    this.sendBtn = $(".chat-input button", root);
    this.stepsEl = $(".bot-steps", root);
    this.data = {};
    this.waiting = null; // {kind:'text', next:fn, placeholder}
    var self = this;
    this.sendBtn.addEventListener("click", function () { self.submitText(); });
    this.input.addEventListener("keydown", function (e) {
      if (e.key === "Enter") { e.preventDefault(); self.submitText(); }
    });
  }
  Bot.prototype.setStep = function (n, label) {
    if (!this.stepsEl) return;
    this.stepsEl.innerHTML = "<span>Schritt <b>" + n + " von 4</b> — " + label + "</span>";
  };
  Bot.prototype.addMsg = function (who, text) {
    var m = el("div", "msg " + who);
    var safe = text.replace(/</g, "&lt;");
    m.innerHTML = safe + '<span class="time">' + nowTime() +
      (who === "user" ? ' <span class="tick">✓✓</span>' : "") + "</span>";
    this.chat.appendChild(m);
    scrollChat(this.chat);
    return m;
  };
  Bot.prototype.botSay = function (text, cb, delay) {
    var self = this;
    var t = el("div", "typing");
    t.innerHTML = "<i></i><i></i><i></i>";
    this.chat.appendChild(t);
    scrollChat(this.chat);
    setTimeout(function () {
      t.remove();
      self.addMsg("bot", text);
      if (cb) cb();
    }, delay == null ? 750 : delay);
  };
  Bot.prototype.showChips = function (labels, onPick) {
    var self = this;
    this.chips.innerHTML = "";
    labels.forEach(function (label) {
      var b = el("button", "chip", label);
      b.type = "button";
      b.addEventListener("click", function () {
        self.chips.innerHTML = "";
        self.addMsg("user", label);
        onPick(label);
      });
      self.chips.appendChild(b);
    });
  };
  Bot.prototype.askText = function (placeholder, next) {
    this.input.placeholder = placeholder;
    this.input.disabled = false;
    this.input.focus();
    this.waiting = next;
  };
  Bot.prototype.submitText = function () {
    if (!this.waiting) return;
    var v = this.input.value.trim();
    if (!v) { this.input.focus(); return; }
    this.input.value = "";
    this.input.disabled = true;
    var next = this.waiting;
    this.waiting = null;
    this.addMsg("user", v);
    next(v);
  };
  Bot.prototype.restartChips = function () {
    var self = this;
    var b = el("button", "chip", "↺ Neues Gespräch starten");
    b.type = "button";
    b.addEventListener("click", function () { self.start(); });
    this.chips.innerHTML = "";
    this.chips.appendChild(b);
  };
  Bot.prototype.ticket = function (rows, emergency) {
    var t = el("div", "ticket");
    var h = "<h4>" + (emergency ? "Notfall-Ticket (Demo)" : "Ihre Anfrage (Demo)") + "</h4><dl>";
    rows.forEach(function (r) {
      h += "<dt>" + r[0] + "</dt><dd>" + r[1].replace(/</g, "&lt;") + "</dd>";
    });
    h += "</dl><span class=\"ok\">✓ Anfrage gesendet (Demo)</span>";
    t.innerHTML = h;
    this.chat.appendChild(t);
    scrollChat(this.chat);
    this.restartChips();
  };
  Bot.prototype.finish = function (emergency) {
    var self = this;
    var d = this.data;
    var rows = [
      ["Anliegen", d.topicLabel || "—"],
      ["Ort", d.ort || "—"],
      ["Wunschtermin", d.callback || d.wunschtermin || "—"]
    ];
    if (d.name) rows.push(["Name", d.name]);
    if (d.phone) rows.push(["Rückrufnummer", d.phone]);
    var summary = emergency
      ? "Notiert: " + (d.topicLabel || "Heizung ausgefallen") + ", " + (d.ort || "Kassel") +
        ", Rückruf " + (d.callback || "nach Wunschtermin") +
        ". Ein Monteur meldet sich bei Ihnen. Oder rufen Sie direkt an: " + PHONE + "."
      : "Notiert: " + (d.topicLabel || "Anfrage") + ", " + (d.ort || "Kassel") +
        ", Wunschtermin " + (d.callback || d.wunschtermin || "nach Absprache") +
        ". Wir melden uns zum vereinbarten Wunschtermin bei Ihnen.";
    this.botSay(summary, function () { self.ticket(rows, emergency); }, 900);
  };
  Bot.prototype.askCallback = function (emergency) {
    var self = this;
    this.setStep(3, "Wunschtermin");
    this.botSay("Danke! Wann passt Ihnen ein Rückruf am besten? Bitte wählen Sie einen Wunschtermin — wir bestätigen den Termin nach Prüfung.", function () {
      self.showChips(CALLBACKS, function (pick) {
        self.data.callback = pick;
        self.askContact(emergency);
      });
    });
  };
  Bot.prototype.askContact = function (emergency) {
    var self = this;
    this.setStep(4, "Kontaktdaten");
    this.botSay("Fast geschafft: Wie ist Ihr Name?", function () {
      self.askText("Ihr Name", function (name) {
        self.data.name = name;
        self.botSay("Und unter welcher Nummer erreichen wir Sie für den Rückruf?", function () {
          self.askText("Ihre Rückrufnummer", function (phone) {
            self.data.phone = phone;
            self.finish(emergency);
          });
        });
      });
    });
  };
  Bot.prototype.askOrt = function (emergency) {
    var self = this;
    this.setStep(2, "Ort");
    this.botSay("In welchem Ortsteil von Kassel oder in welcher Gemeinde in der Umgebung befindet sich die Anlage?", function () {
      self.askText("PLZ oder Ortsteil, z. B. 34121 Wehlheiden", function (ort) {
        self.data.ort = ort;
        self.askCallback(emergency);
      });
    });
  };
  Bot.prototype.pickTopic = function (topic) {
    var self = this;
    this.data.topicLabel = topic.label;
    this.data.emergency = !!topic.emergency;
    if (topic.emergency) {
      this.botSay("Das klingt nach einem Notfall — haben Sie noch Warmwasser?", function () {
        self.showChips(["Ja, Warmwasser vorhanden", "Nein, auch kein Warmwasser"], function (pick) {
          self.data.warmwasser = pick;
          if (pick.indexOf("Nein") === 0) {
            self.botSay("Verstanden. Ich leite das als Notfall weiter.", function () { self.askOrt(true); });
          } else {
            self.botSay("Gut, dass noch Warmwasser da ist. Damit wir den Einsatz einplanen können:", function () { self.askOrt(true); });
          }
        });
      });
    } else {
      this.botSay("Gerne — ich nehme Ihre Anfrage auf. Zuerst der Ort:", function () { self.askOrt(false); });
    }
  };
  Bot.prototype.start = function () {
    var self = this;
    this.chat.innerHTML = "";
    this.chips.innerHTML = "";
    this.data = {};
    this.input.disabled = true;
    this.input.placeholder = "Ihre Nachricht eingeben …";
    this.setStep(1, "Anliegen");
    var topics = this.mode === "router" ? ROUTER_TOPICS : TOPICS;
    this.botSay("Hallo! Ich bin der digitale Assistent von Gessner & Sohn. Worum geht es bei Ihnen?", function () {
      self.showChips(topics.map(function (t) { return t.label; }), function (label) {
        var topic = topics.filter(function (t) { return t.label === label; })[0];
        self.pickTopic(topic);
      });
    }, 500);
  };
  /* Hero sample transcript (scripted, visible on load) */
  Bot.prototype.playSample = function () {
    var self = this;
    this.chat.innerHTML = "";
    this.chips.innerHTML = "";
    this.input.disabled = true;
    var sample = [
      ["bot", "Hallo! Ich bin der digitale Assistent von Gessner & Sohn. Worum geht es bei Ihnen?", "08:14"],
      ["user", "Meine Heizung springt nicht mehr an.", "08:14"],
      ["bot", "Das klingt nach einem Notfall — haben Sie noch Warmwasser?", "08:14"],
      ["user", "Nein, auch kein Warmwasser.", "08:15"],
      ["bot", "Verstanden. Ich leite das als Notfall weiter. In welchem Ortsteil von Kassel sind Sie?", "08:15"],
      ["user", "Wehlheiden", "08:16"],
      ["bot", "Danke! Wann passt Ihnen ein Rückruf am besten? Bitte wählen Sie einen Wunschtermin.", "08:16"]
    ];
    sample.forEach(function (s) {
      var m = el("div", "msg " + s[0]);
      m.innerHTML = s[1].replace(/</g, "&lt;") + '<span class="time">' + s[2] +
        (s[0] === "user" ? ' <span class="tick">✓✓</span>' : "") + "</span>";
      self.chat.appendChild(m);
    });
    scrollChat(this.chat);
    this.data = { topicLabel: "Heizung defekt", ort: "Wehlheiden", emergency: true };
    this.showChips(CALLBACKS, function (pick) {
      self.data.callback = pick;
      self.askContact(true);
    });
    var restart = el("button", "chip", "↺ Neues Gespräch starten");
    restart.type = "button";
    restart.addEventListener("click", function () { self.start(); });
    this.chips.appendChild(restart);
  };

  /* ---------------- init bots ---------------- */
  $$(".phone.bot").forEach(function (root) {
    var bot = new Bot(root);
    if (root.getAttribute("data-bot-mode") === "hero") bot.playSample();
    else bot.start();
  });

  /* ---------------- mini bots (static triage widgets) ---------------- */
  $$(".mini-bot").forEach(function (box) {
    var chat = $(".chat", box);
    var chips = $(".chips", box);
    $$("button[data-reply]", chips).forEach(function (btn) {
      btn.addEventListener("click", function () {
        var u = el("div", "msg user", btn.textContent + '<span class="time">' + nowTime() + ' <span class="tick">✓✓</span></span>');
        chat.appendChild(u);
        var t = el("div", "typing"); t.innerHTML = "<i></i><i></i><i></i>";
        chat.appendChild(t);
        scrollChat(chat);
        setTimeout(function () {
          t.remove();
          var b = el("div", "msg bot");
          b.innerHTML = btn.getAttribute("data-reply") + '<span class="time">' + nowTime() + "</span>";
          chat.appendChild(b);
          var link = el("a", "card-link", btn.getAttribute("data-link-label") || "Zur Anfrage →");
          link.href = btn.getAttribute("data-link") || "kontakt.html";
          var wrap = el("div", "msg bot");
          wrap.appendChild(link);
          chat.appendChild(wrap);
          scrollChat(chat);
        }, 700);
      });
    });
  });

  /* ---------------- Notdienst triage modules ---------------- */
  var triageData = {
    "modul-1": {
      title: "Sofortmaßnahmen: Totalausfall Heizung",
      steps: [
        "Anlagendruck am Manometer prüfen — liegt der Druck unter 1,2 bar, schaltet die Anlage oft wegen Wassermangel automatisch ab. Manometerwert vor dem Anruf notieren.",
        "Heizungs-Notschalter und Sicherung kontrollieren — prüfen Sie den roten Notschalter außerhalb des Heizraums und die Leitungsschutzschalter im Sicherungskasten.",
        "Fehlercode im Kesseldisplay ablesen — notieren Sie Ziffern oder Buchstaben (z. B. F.28, F.22, 6A, E4) vor dem Anruf, damit Ersatzteile gezielt mitgebracht werden können."
      ]
    },
    "modul-2": {
      title: "Sofortmaßnahmen: Wasser austritt / Rohrbruch",
      steps: [
        "Hauptwasserhahn schließen — drehen Sie die Hauptabsperrung zu, um weiteren Wasseraustritt zu stoppen.",
        "Strom in betroffenen Bereichen abschalten, wenn Wasser in Steckdosen oder Elektrogeräte gelangt sein könnte.",
        "Wasser mit Eimern und Handtüchern aufnehmen, Möbel und Elektrogeräte aus dem Wasserbereich räumen und die betroffene Stelle fotografieren."
      ]
    },
    "modul-3": {
      title: "Sofortmaßnahmen: Kein Warmwasser",
      steps: [
        "Prüfen, ob die Heizung selbst läuft — heizen die Heizkörper, ist der Fehler meist auf den Warmwasserspeicher oder die Regelung begrenzt.",
        "Thermostat und Zeitschaltuhr prüfen — ist die Warmwasserbereitung versehentlich ausgeschaltet oder auf Sommerbetrieb gestellt?",
        "Fehlercode und Speicher-Temperatur notieren und uns anrufen — wir klären am Telefon, ob ein Monteur kommen muss."
      ]
    },
    "modul-4": {
      title: "Sofortmaßnahmen: Störung / Warnton",
      steps: [
        "Fehlercode oder Warnton notieren — schreiben Sie die Anzeige im Display genau ab, bevor Sie etwas verstellen.",
        "Anlage nicht mehrfach neu starten — wiederholte Reset-Versuche können den Fehler verschlimmern.",
        "Bei Gasgeruch: sofort handeln (siehe Sicherheitshinweis unten) und den Notruf wählen."
      ]
    }
  };
  $$("[data-triage]").forEach(function (btn) {
    btn.addEventListener("click", function () {
      var d = triageData[btn.getAttribute("data-triage")];
      var panel = $("#triage-panel");
      if (!panel || !d) return;
      var html = "<h3>" + d.title + "</h3><ol>";
      d.steps.forEach(function (s) { html += "<li>" + s + "</li>"; });
      html += "</ol><p><a class=\"btn btn-yellow\" href=\"tel:+4956121060\">Jetzt anrufen: 0561 / 21060</a></p>";
      panel.innerHTML = html;
      panel.scrollIntoView({ behavior: "smooth", block: "nearest" });
      $$("[data-triage]").forEach(function (b) { b.setAttribute("aria-pressed", "false"); });
      btn.setAttribute("aria-pressed", "true");
    });
  });

  /* ---------------- demo forms ---------------- */
  $$("form.demo-form").forEach(function (form) {
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var ok = el("div", "form-success");
      ok.setAttribute("role", "status");
      ok.innerHTML = "<h3>✓ Anfrage gesendet (Demo)</h3><p>Vielen Dank für Ihre Anfrage. Dies ist eine Demo — es wurden keine Daten übertragen. In der echten Version meldet sich das Meisterbüro bei Ihnen.</p><p class=\"small muted\">Oder rufen Sie direkt an: <a href=\"tel:+4956121060\">0561 / 21060</a></p>";
      form.parentNode.insertBefore(ok, form.nextSibling);
      form.reset();
      ok.scrollIntoView({ behavior: "smooth", block: "nearest" });
    });
  });
  $$("input[type=file]").forEach(function (input) {
    input.addEventListener("change", function () {
      var name = input.files && input.files[0] ? input.files[0].name : "Keine Datei ausgewählt";
      var target = input.closest(".file-row") && $(".file-name", input.closest(".file-row"));
      if (target) target.textContent = name;
    });
  });

  /* ---------------- mobile nav ---------------- */
  var toggle = $(".nav-toggle");
  var nav = $("#main-nav");
  if (toggle && nav) {
    toggle.addEventListener("click", function () {
      var open = nav.classList.toggle("open");
      toggle.setAttribute("aria-expanded", open ? "true" : "false");
    });
    $$("a", nav).forEach(function (a) {
      a.addEventListener("click", function () { nav.classList.remove("open"); });
    });
  }

  /* ---------------- legal tabs ---------------- */
  var tabBtns = $$(".tab-btn");
  if (tabBtns.length) {
    var sections = { impressum: $("#impressum"), datenschutz: $("#datenschutz") };
    function showTab(name) {
      tabBtns.forEach(function (b) {
        b.setAttribute("aria-selected", b.getAttribute("data-tab") === name ? "true" : "false");
      });
      Object.keys(sections).forEach(function (k) {
        if (sections[k]) sections[k].hidden = (k !== name);
      });
    }
    tabBtns.forEach(function (b) {
      b.addEventListener("click", function () { showTab(b.getAttribute("data-tab")); });
    });
    if (location.hash === "#datenschutz") showTab("datenschutz");
    else showTab("impressum");
  }
})();
