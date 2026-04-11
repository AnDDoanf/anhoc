---
title: Chương 8. HÌNH HỌC PHẲNG. CÁC HÌNH HÌNH HỌC CƠ BẢN
description: Làm quen với các khái niệm cơ bản nhất của hình học là điểm và đường thẳng.
---

### **Bài 1. Điểm. Đường thẳng**

1. **Điểm**
    - Mỗi chấm nhỏ trên trang giấy, trên bảng... cho ta hình ảnh của một **điểm**.
    - Người ta thường dùng các chữ cái in hoa $A, B, C, \dots$ để đặt tên cho điểm.
    - *Chú ý:*
        - Khi nói tới hai điểm mà không giải thích gì thêm, ta coi đó là hai điểm phân biệt.
        - Từ những điểm, ta xây dựng được các hình. Mỗi hình là một tập hợp các điểm. Một điểm cũng được coi là một hình.

2. **Đường thẳng**
    - Dùng bút kẻ một vạch thẳng dọc theo mép thước ta sẽ được hình ảnh của một **đường thẳng**. Sợi dây điện kéo căng, mép tường... cũng cho ta hình ảnh của đường thẳng.
    - **Đường thẳng không bị giới hạn về hai phía.**

```tikz
\begin{tikzpicture}
  \draw[thick, <->] (-3,0) -- (3,0) node[right] {$a$};
  \draw[fill] (-1.5,0) circle (1.5pt) node[below] {$A$};
  \draw[fill] (1.5,0) circle (1.5pt) node[below] {$B$};
\end{tikzpicture}
```

    - *Chú ý:*
        - Người ta dùng các chữ cái in thường $a, b, c, d, \dots$ để đặt tên cho các đường thẳng.
        - Nếu trên đường thẳng $a$ có hai điểm $A$ và $B$, ta cũng có thể gọi tên đường thẳng đó là đường thẳng $AB$ hay $BA$.

3. **Điểm thuộc đường thẳng. Điểm không thuộc đường thẳng**
    - **Điểm thuộc đường thẳng:** Nếu điểm $A$ nằm trên đường thẳng $d$, ta nói điểm $A$ thuộc đường thẳng $d$ (hoặc đường thẳng $d$ chứa điểm $A$).
        - Kí hiệu: $A \in d$.

```tikz
\begin{tikzpicture}
  \draw[thick] (-2,0) -- (2,0) node[right] {$d$};
  \draw[fill] (0,0) circle (1.5pt) node[above] {$A$};
\end{tikzpicture}
```

    - **Điểm không thuộc đường thẳng:** Nếu điểm $B$ không nằm trên đường thẳng $d$, ta nói điểm $B$ không thuộc đường thẳng $d$ (hoặc đường thẳng $d$ không chứa điểm $B$).
        - Kí hiệu: $B \notin d$.

```tikz
\begin{tikzpicture}
  \draw[thick] (-2,0) -- (2,0) node[right] {$d$};
  \draw[fill, orange] (0.5,1) circle (1.5pt) node[above] {$B$};
\end{tikzpicture}
```

4. **Cách vẽ đường thẳng đi qua hai điểm:**
    - Bước 1: Vẽ hai điểm $A$ và $B$ trên giấy.
    - Bước 2: Đặt cạnh thước đi qua hai điểm $A$ và $B$.
    - Bước 3: Dùng đầu bút vạch thẳng theo cạnh thước.
    - Kết quả: Ta được hình ảnh của đường thẳng đi qua hai điểm $A$ và $B$.
