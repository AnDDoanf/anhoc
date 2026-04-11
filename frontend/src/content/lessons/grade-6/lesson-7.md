---
title: Chương 7. TÍNH ĐỐI XỨNG CỦA HÌNH PHẲNG TRONG THẾ GIỚI TỰ NHIÊN
description: Khám phá về tâm đối xứng và vai trò của tính đối xứng trong vẻ đẹp của thế giới tự nhiên.
---

### **Bài 1. Hình có tâm đối xứng**

1. **Định nghĩa:**
    Điểm $O$ được gọi là **tâm đối xứng** của một hình nếu nó là trung điểm của đoạn thẳng nối hai điểm tương ứng bất kì trên hình đó.

```tikz
\begin{tikzpicture}[scale=1.5]
  \draw[blue, thick] (0,0) circle (1cm);
  \draw[fill] (0,0) circle (1.5pt) node[below=4pt] {$O$};
  \draw[dashed, gray] (-1,0) -- (1,0);
  \draw[fill] (-1,0) circle (1.5pt) node[left=4pt] {$A$};
  \draw[fill] (1,0) circle (1.5pt) node[right=4pt] {$A'$};
\end{tikzpicture}
```

2. **Ví dụ về hình có tâm đối xứng:**
    - **Đường tròn $(O)$**: Là hình có tâm đối xứng và $O$ chính là tâm đối xứng của nó. Mọi đoạn thẳng nối hai điểm đối diện qua $O$ đều nhận $O$ làm trung điểm.
    - **Hình bình hành $ABCD$**: Là hình có tâm đối xứng. Giao điểm $I$ của hai đường chéo chính là tâm đối xứng của hình bình hành đó.

```tikz
\begin{tikzpicture}[scale=1.2]
  \coordinate (A) at (1,2);
  \draw[fill] (A) circle (1.5pt) node[above left] {$A$};
  \coordinate (B) at (4,2);
  \draw[fill] (B) circle (1.5pt) node[above right] {$B$};
  \coordinate (C) at (3,0);
  \draw[fill] (C) circle (1.5pt) node[below right] {$C$};
  \coordinate (D) at (0,0);
  \draw[fill] (D) circle (1.5pt) node[below left] {$D$};
  \draw[thick] (A) -- (B) -- (C) -- (D) -- cycle;
  \draw[dashed, blue] (A) -- (C);
  \draw[dashed, blue] (B) -- (D);
  \draw[fill] (2,1) circle (1.5pt) node[below=4pt] {$I$};
\end{tikzpicture}
```

3. **Cách xác định:**
    Nếu ta quay một hình quanh một điểm $O$ một góc $180^\circ$ mà hình đó chồng khít lên chính nó thì điểm $O$ đó được gọi là tâm đối xứng của hình.

---

### **Bài 2. Vai trò của tính đối xứng trong thế giới tự nhiên**

1. **Hình có tính đối xứng:**
    Hình có trục đối xứng hoặc có tâm đối xứng được gọi chung là **hình có tính đối xứng**.

2. **Vẻ đẹp và ứng dụng:**
    - Từ xưa đến nay, những hình có tính đối xứng luôn được coi là **cân đối và hài hoà**.
    - Con người học tập từ thiên nhiên thông qua tính đối xứng để thiết kế các công trình kiến trúc, máy móc và đồ dùng hàng ngày (ví dụ: máy bay, kiến trúc đình chùa, họa tiết trang trí).
    - Trong tự nhiên, tính đối xứng xuất hiện rất nhiều: bông hoa, con bướm, tinh thể tuyết, cơ thể con người... giúp tạo nên sự ổn định và vẻ đẹp tự nhiên.
